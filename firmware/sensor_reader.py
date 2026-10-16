"""Adaptación de lecturas físicas al contrato de la API; sin datos simulados."""
from sensors.temperature import TemperatureReader, TemperatureSensorMissing


class SensorReader:
    def __init__(self, config):
        self.temperature = TemperatureReader(getattr(config, "TEMPERATURE_GPIO", 4))
        self.temperature_calibrated = (
            getattr(config, "TEMPERATURE_CALIBRATION_CONFIRMED", False) is True
        )

    def read(self):
        # Los sensores pendientes no se sustituyen por ceros ni valores de ejemplo.
        readings = {
            "ph": None,
            "temperature_c": None,
            "turbidity_value": None,
            "turbidity_unit": None,
            "ec_us_cm": None,
            "quality": {
                "ph": "missing",
                "temperature_c": "missing",
                "turbidity_value": "missing",
                "ec_us_cm": "missing",
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
        return readings


_reader = None


def read_sensors():
    """Función compatible con integration_runner.run(read_sensors)."""
    global _reader
    if _reader is None:
        import config

        _reader = SensorReader(config)
    return _reader.read()
