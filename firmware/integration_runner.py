"""Integración explícita: NO sustituye ni crea main.py o boot.py de la placa.

Invocar run(read_sensors) solo tras conectar el adaptador físico real.
"""
import time
import config
from telemetry import Telemetry
from wifi_manager import WifiManager
from clock_manager import ClockManager


def run(read_sensors, on_reading=None):
    if not 5 <= config.SEND_INTERVAL_SECONDS <= 3600:
        raise ValueError("Intervalo fuera de rango")
    wifi = WifiManager(config)
    clock = ClockManager(config)
    telemetry = Telemetry(config)
    next_reading = time.ticks_ms()
    adapter_warning_shown = False
    previous_connection = None
    print("Conectando Wi-Fi; las lecturas se conservan temporalmente en RAM.")
    while True:
        now = time.ticks_ms()
        if time.ticks_diff(now, next_reading) >= 0:
            try:
                readings = read_sensors()
                if on_reading:
                    on_reading(readings)  # Mantiene la visualización local en Thonny.
                telemetry.enqueue(readings)
            except NotImplementedError:
                if not adapter_warning_shown:
                    print("Adaptador de sensores pendiente; no se enviarán lecturas inventadas.")
                    adapter_warning_shown = True
            except Exception:
                # No se imprime el objeto de excepción: puede contener configuración.
                print("Error de adquisición o contrato. Revisar sensores/adaptador.")
            next_reading = time.ticks_add(time.ticks_ms(), config.SEND_INTERVAL_SECONDS * 1000)
        try:
            connected = wifi.tick()
        except OSError:
            connected = False
        if connected != previous_connection:
            print("Wi-Fi conectado." if connected else "Sin Wi-Fi; esperando conexion.")
            previous_connection = connected
        clock_ready = clock.tick(connected)
        telemetry.tick(connected and clock_ready)
        time.sleep_ms(50)
