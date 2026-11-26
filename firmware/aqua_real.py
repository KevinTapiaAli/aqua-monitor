"""Entrada manual para Thonny: sensores reales, OLED, RGB y HTTPS existente.

No sustituye boot.py/main.py ni altera credenciales o modulos de transporte.
La frecuencia local es aproximada: NTP y HTTPS pueden retrasar lecturas.
"""
from machine import Pin, ADC, SoftI2C
import time
import gc
import onewire
import ds18x20
import config
from wifi_manager import WifiManager
from clock_manager import ClockManager
from telemetry import Telemetry
from api_client import ConfigurationError


class Hardware:
    def __init__(self):
        self.errors = {}
        self.temp = ds18x20.DS18X20(onewire.OneWire(Pin(4)))
        self.ldr = ADC(Pin(34))
        self.ldr.atten(ADC.ATTN_11DB)
        self.gas = None
        if all(getattr(config, name, False) is True for name in (
            "MQ135_ENABLED", "MQ135_VOLTAGE_SAFE_CONFIRMED",
            "MQ135_STABILIZATION_CONFIRMED",
        )):
            self.gas = ADC(Pin(35))
            self.gas.atten(ADC.ATTN_11DB)
        else:
            print("MQ135 desactivado: conserva las confirmaciones de config.py.")
        self.rgb = None
        self.anode = getattr(config, "RGB_COMMON_ANODE", False)
        if getattr(config, "RGB_ENABLED", False):
            off = 1 if self.anode else 0
            self.rgb = tuple(Pin(p, Pin.OUT, value=off) for p in (25, 26, 27))
        self.oled = None
        self.next_oled = time.ticks_ms()
        self.rail_count = 0

    def report(self, name, error=None):
        message = None if error is None else str(error)
        if self.errors.get(name) != message:
            print(name + ":", "recuperado" if message is None else message)
            self.errors[name] = message

    def color(self, r, g, b):
        if self.rgb:
            for pin, value in zip(self.rgb, (r, g, b)):
                pin.value(1 - value if self.anode else value)

    def connect_oled(self):
        if not getattr(config, "OLED_ENABLED", True):
            return
        if self.oled is not None or time.ticks_diff(time.ticks_ms(), self.next_oled) < 0:
            return
        self.next_oled = time.ticks_add(time.ticks_ms(), 30000)
        try:
            from ssd1306 import SSD1306_I2C
            bus = SoftI2C(sda=Pin(21), scl=Pin(22), freq=100000, timeout=10000)
            # Probar solo las dos direcciones OLED habituales, sin barrer todo el bus.
            last_error = None
            for address in (0x3c, 0x3d):
                try:
                    bus.writeto(address, b"")
                    self.oled = SSD1306_I2C(128, 64, bus, addr=address)
                    self.report("OLED")
                    print("OLED conectada:", hex(address))
                    return
                except OSError as error:
                    last_error = error
            raise OSError("Sin respuesta en 0x3c/0x3d: " + str(last_error))
        except (OSError, ImportError, ValueError, TypeError, MemoryError) as error:
            self.oled = None
            self.report("OLED", type(error).__name__ + " " + str(error))

    def read(self):
        keys = ("temperature_c", "soil_adc", "gas_adc", "light_adc")
        data = {key: None for key in keys}
        data["quality"] = {key: "missing" for key in keys}
        data["raw"] = {}
        try:
            roms = self.temp.scan()
            if not roms:
                raise OSError("No se detecta DS18B20 en GPIO 4")
            if len(roms) != 1:
                raise ValueError("Hay varias sondas; seleccionar ROM antes de medir")
            self.temp.convert_temp()
            time.sleep_ms(750)
            value = self.temp.read_temp(roms[0])
            if value is None or not -55 <= value <= 125:
                raise ValueError("Lectura fuera del rango DS18B20")
            self.store(data, "temperature_c", value, "°C", "DS18B20: lectura original")
            self.report("Temperatura")
        except (OSError, ValueError, IndexError) as error:
            self.failed(data, "temperature_c", "°C", "Sonda sin lectura valida")
            self.report("Temperatura", type(error).__name__ + " " + str(error))
        for key, adc in (("light_adc", self.ldr), ("gas_adc", self.gas)):
            if adc is None:
                continue
            try:
                value = adc.read_u16()
                self.store(data, key, value, "ADC", "ADC original de 16 bits")
                self.report(key)
            except (OSError, ValueError) as error:
                self.failed(data, key, "ADC", "No se pudo leer la entrada")
                self.report(key, type(error).__name__ + " " + str(error))
        return data

    @staticmethod
    def store(data, key, value, unit, note):
        # Se conserva la calidad original: no inventar calibracion ni unidades.
        data["quality"][key] = "uncalibrated"
        data["raw"][key] = {"value": value, "unit": unit, "note": note}

    @staticmethod
    def failed(data, key, unit, note):
        data["quality"][key] = "sensor_error"
        data["raw"][key] = {"value": None, "unit": unit, "note": note}

    def show(self, data, connected, synced, telemetry):
        raw = data["raw"]
        temp = raw.get("temperature_c", {}).get("value")
        light = raw.get("light_adc", {}).get("value")
        gas = raw.get("gas_adc", {}).get("value")
        self.rail_count = self.rail_count + 1 if light == 65535 else 0
        # Coincide con el umbral inicial 50% de la web: ADC menor = mas luz.
        threshold = getattr(config, "LDR_THRESHOLD_ADC", 32768)
        state = None if light is None else int(light < threshold)
        gas_percent = None if gas is None else gas * 100 / 65535
        gas_text = "--" if gas_percent is None else "{:.1f}% escala".format(gas_percent)
        light_text = "--" if state is None else ("1 CON LUZ" if state else "0 OSCURO")
        if self.rail_count >= 3:
            light_text = "REVISAR ADC"
        status = "SIN WIFI" if not connected else "ESPERANDO NTP"
        if connected and synced:
            if telemetry is None:
                status = "REVISAR API"
            elif telemetry.paused:
                status = "API PAUSADA"
            elif telemetry.queue:
                status = "ENVIO PENDIENTE"
            elif telemetry.last_http_status in (200, 201):
                status = "API OK"
            else:
                status = "ENVIANDO"
        problem = temp is None or light is None or self.rail_count >= 3
        if problem:
            self.color(1, 0, 0)
        elif not connected or not synced or telemetry is None or telemetry.paused:
            self.color(0, 0, 1)
        elif telemetry.last_http_status in (200, 201) and not telemetry.queue:
            self.color(0, 1, 0)
        else:
            self.color(0, 0, 1)
        print("Temp:", temp, "C | Luz:", light_text, "ADC:", light)
        print("Gas:", gas_text, "ADC:", gas, "|", status)
        if self.rail_count == 3:
            print("LDR: tres lecturas al maximo; el estado oscuro no confirma iluminacion real.")
        self.connect_oled()
        if self.oled is not None:
            try:
                lines = (
                    "MICROCLIMA UCB",
                    "Temp: --" if temp is None else "Temp: {:.2f} C".format(temp),
                    "Luz: " + light_text,
                    "Gas: " + gas_text,
                    "LDR AL MAXIMO" if self.rail_count >= 3 else status,
                )
                self.oled.fill(0)
                for index, line in enumerate(lines):
                    self.oled.text(line[:16], 0, index * 12)
                self.oled.show()
            except (OSError, ValueError) as error:
                self.oled = None
                self.next_oled = time.ticks_add(time.ticks_ms(), 30000)
                self.report("OLED", type(error).__name__ + " " + str(error))


def ejecutar():
    print("=== AQUA MONITOR: LECTURAS REALES ===")
    print("GPIO: temperatura 4; LDR AO 34; MQ135 AO 35; OLED SDA21/SCL22")
    print("Gas: porcentaje de escala electrica, no CO2 ni concentracion por gas.")
    print("RGB: estado tecnico del equipo, no calidad del aire.")
    hardware = Hardware()
    wifi = WifiManager(config)
    clock = ClockManager(config)
    # No aceptar la hora local de Thonny como si fuera UTC: sincronizar por NTP.
    telemetry = None
    try:
        gc.collect()
        telemetry = Telemetry(config)
    except (OSError, ValueError, AttributeError, MemoryError, ConfigurationError):
        print("No se pudo iniciar HTTPS. Revisar config.py y certificado; lectura local continua.")
    interval = max(5000, int(getattr(config, "SEND_INTERVAL_SECONDS", 10) * 1000))
    next_send = time.ticks_ms()
    previous_wifi = None
    try:
        while True:
            start = time.ticks_ms()
            try:
                connected = wifi.tick()
            except OSError:
                connected = False
            if connected != previous_wifi:
                print("Wi-Fi conectado" if connected else "Esperando Wi-Fi")
                previous_wifi = connected
            synced = clock.tick(connected)
            # Adquirir despues de NTP para fechar la muestra en UTC correctamente.
            data = hardware.read()
            now = time.ticks_ms()
            if telemetry is not None and time.ticks_diff(now, next_send) >= 0:
                if synced:
                    try:
                        telemetry.enqueue(data)
                    except (ValueError, TypeError) as error:
                        print("Contrato de envio:", type(error).__name__, str(error))
                else:
                    print("Envio pendiente de hora UTC por NTP.")
                next_send = time.ticks_add(now, interval)
            hardware.show(data, connected, synced, telemetry)
            if telemetry is not None and connected and synced:
                gc.collect()
                telemetry.tick(True)
            # Sin rafagas para recuperar atrasos: HTTPS puede bloquear este ciclo.
            remaining = 1000 - time.ticks_diff(time.ticks_ms(), start)
            time.sleep_ms(max(20, remaining))
    finally:
        hardware.color(0, 0, 0)


if __name__ == "__main__":
    ejecutar()
