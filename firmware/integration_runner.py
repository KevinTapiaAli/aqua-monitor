"""Integración explícita: NO sustituye ni crea main.py o boot.py de la placa.

Invocar run(read_sensors) solo tras conectar el adaptador físico real.
"""
import time
import config
from telemetry import Telemetry
from wifi_manager import WifiManager


def run(read_sensors, on_reading=None):
    if not 5 <= config.SEND_INTERVAL_SECONDS <= 3600:
        raise ValueError("Intervalo fuera de rango")
    wifi = WifiManager(config)
    telemetry = Telemetry(config)
    next_reading = time.ticks_ms()
    adapter_warning_shown = False
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
        telemetry.tick(connected)
        time.sleep_ms(50)
