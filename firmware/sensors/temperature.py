"""Lectura DS18x20 basada en el archivo IoT_medidor_temp.py del equipo.

Conserva GPIO 4 por defecto, convert_temp(), espera de 750 ms y read_temp().
El modelo exacto de la sonda y su calibración aún deben confirmarse.
"""
import math
import time


class TemperatureSensorMissing(Exception):
    pass


class TemperatureReader:
    def __init__(self, gpio=4):
        self.gpio = gpio
        self._sensor = None
        self._rom = None

    def read_celsius(self):
        try:
            if self._sensor is None:
                import machine
                import onewire
                import ds18x20

                pin_datos = machine.Pin(self.gpio)
                self._sensor = ds18x20.DS18X20(onewire.OneWire(pin_datos))

            if self._rom is None:
                roms = self._sensor.scan()
                if not roms:
                    raise TemperatureSensorMissing("No se encontro el sensor")
                # Conserva la selección inicial del original. No cambia de sonda
                # silenciosamente después de un error o una desconexión.
                self._rom = bytes(roms[0])

            self._sensor.convert_temp()
            time.sleep_ms(750)
            temperatura = self._sensor.read_temp(self._rom)
            if type(temperatura) not in (int, float) or not math.isfinite(temperatura):
                raise ValueError("Temperatura no numerica o no finita")
            if temperatura < -273.15:
                raise ValueError("Temperatura fisicamente incompatible")
            return temperatura
        except Exception:
            # Permite reintentar en el siguiente ciclo sin detener la adquisición.
            # Se mantiene la ROM seleccionada; no se imprime la excepción.
            self._sensor = None
            raise
