"""Adaptación de lecturas físicas al contrato de la API; sin datos simulados."""
from sensors.temperature import TemperatureReader, TemperatureSensorMissing
from sensors.analog import AnalogReader


class SensorReader:
    def __init__(self, config):
        self.temperature = TemperatureReader(getattr(config, "TEMPERATURE_GPIO", 4))
        self.temperature_calibrated = (
            getattr(config, "TEMPERATURE_CALIBRATION_CONFIRMED", False) is True
        )
        self.config = config
        self.soil = AnalogReader(getattr(config, "SOIL_GPIO", None), getattr(config, "SOIL_ATTENUATION_DB", None))
        self.gas = AnalogReader(getattr(config, "MQ135_GPIO", None), getattr(config, "MQ135_ATTENUATION_DB", None))
        self.light = AnalogReader(getattr(config, "LDR_GPIO", None), getattr(config, "LDR_ATTENUATION_DB", None))

    def read(self):
        # Los sensores pendientes no se sustituyen por ceros ni valores de ejemplo.
        readings = {
            "soil_adc": None,
            "temperature_c": None,
            "gas_adc": None,
            "light_adc": None,
            "quality": {
                "soil_adc": "missing",
                "temperature_c": "missing",
                "gas_adc": "missing",
                "light_adc": "missing",
            },
            "raw": {},
        }
        try:
            temperatura = self.temperature.read_celsius()
            readings["raw"]["temperature_c"] = {
                "value": temperatura,
                "unit": "°C",
                "note": "Lectura DS18x20 sin correcciones adicionales.",
            }
            if self.temperature_calibrated:
                readings["temperature_c"] = temperatura
                readings["quality"]["temperature_c"] = "ok"
            else:
                readings["quality"]["temperature_c"] = "uncalibrated"
                readings["raw"]["temperature_c"]["note"] = (
                    "Lectura DS18x20; calibracion pendiente de confirmar."
                )
        except TemperatureSensorMissing:
            readings["raw"]["temperature_c"] = {
                "value": None, "unit": "°C", "note": "No se detecto una sonda en el bus."
            }
        except Exception:
            # El error de un sensor no debe interrumpir los demás adaptadores.
            readings["quality"]["temperature_c"] = "sensor_error"
            readings["raw"]["temperature_c"] = {
                "value": None, "unit": "°C", "note": "No se pudo obtener la temperatura."
            }
        self.read_optional(readings, "soil_adc", self.soil, self.soil.read_counts, "ADC")
        self.read_optional(readings, "gas_adc", self.gas, self.gas.read_counts, "ADC")
        self.read_optional(readings, "light_adc", self.light, self.light.read_counts, "ADC")
        return readings

    def read_optional(self, readings, parameter, reader, acquire, unit):
        if reader.gpio is None:
            return
        try:
            pins = [self.temperature.gpio, self.soil.gpio, self.gas.gpio, self.light.gpio]
            if pins.count(reader.gpio) > 1:
                raise ValueError("GPIO compartido entre sensores")
            if parameter == "gas_adc" and getattr(self.config, "MQ135_STABILIZATION_CONFIRMED", False) is not True:
                readings["raw"][parameter] = {"value": None, "unit": unit, "note": "Pendiente de estabilizacion del MQ-135 segun su ficha."}
                return
            value = acquire()
            if value is None:
                return
            readings["raw"][parameter] = {
                "value": value, "unit": unit,
                "note": "Lectura ADC sin convertir; suelo no equivale a porcentaje, gas no equivale a CO2 ppm, luz no equivale a lux."
            }
            readings["quality"][parameter] = "uncalibrated"
        except Exception:
            readings["quality"][parameter] = "sensor_error"
            readings["raw"][parameter] = {"value": None, "unit": unit, "note": "Revisar modelo, GPIO, atenuacion y conexion del sensor."}


_reader = None


def read_sensors():
    """Función compatible con integration_runner.run(read_sensors)."""
    global _reader
    if _reader is None:
        import config

        _reader = SensorReader(config)
    return _reader.read()
