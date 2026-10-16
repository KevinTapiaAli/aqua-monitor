import json
import math
import os
import time
import ubinascii

PARAMETERS = ("ph", "temperature_c", "turbidity_value", "ec_us_cm")
STATES = ("ok", "uncalibrated", "out_of_range", "sensor_error", "missing")


def new_reading_id():
    data = bytearray(os.urandom(16))
    data[6] = (data[6] & 15) | 64
    data[8] = (data[8] & 63) | 128
    value = ubinascii.hexlify(data).decode()
    return "{}-{}-{}-{}-{}".format(value[:8], value[8:12], value[12:16], value[16:20], value[20:])


def utc_timestamp(clock_synced):
    if not clock_synced:
        return None
    now = time.gmtime()
    if now[0] < 2020:
        return None
    return "%04d-%02d-%02dT%02d:%02d:%02dZ" % now[:6]


def finite_number(value):
    return type(value) in (int, float) and math.isfinite(value)


def make_payload(readings, clock_synced=False):
    if not isinstance(readings, dict):
        raise ValueError("El adaptador debe devolver un dict")
    quality = readings.get("quality")
    if not isinstance(quality, dict):
        raise ValueError("Falta quality")
    result = {"reading_id": new_reading_id(), "measured_at": utc_timestamp(clock_synced)}
    for parameter in PARAMETERS:
        if parameter not in readings or quality.get(parameter) not in STATES:
            raise ValueError("Contrato de lectura incompleto")
        value = readings[parameter]
        state = quality[parameter]
        if value is not None and not finite_number(value):
            raise ValueError("Valor no finito o no numérico")
        needs_value = state in ("ok", "out_of_range")
        forbids_value = state in ("missing", "sensor_error") or (state == "uncalibrated" and parameter != "turbidity_value")
        if (needs_value and value is None) or (forbids_value and value is not None):
            raise ValueError("Valor incompatible con su calidad")
        if value is not None and ((parameter in ("turbidity_value", "ec_us_cm") and value < 0) or (parameter == "temperature_c" and value < -273.15)):
            raise ValueError("Valor físicamente incompatible")
        result[parameter] = value
    unit = readings.get("turbidity_unit")
    if (result["turbidity_value"] is None) != (unit is None):
        raise ValueError("Falta valor o unidad de turbidez")
    if unit is not None:
        calibrated = quality["turbidity_value"] in ("ok", "out_of_range")
        if (calibrated and unit != "NTU") or (not calibrated and unit not in ("V", "ADC")):
            raise ValueError("Unidad de turbidez incompatible")
    raw = readings.get("raw", {})
    if not isinstance(raw, dict) or any(key not in PARAMETERS for key in raw):
        raise ValueError("raw inválido")
    for reading in raw.values():
        if not isinstance(reading, dict) or set(reading) - {"value", "unit", "note"}:
            raise ValueError("Lectura original inválida")
        if "value" not in reading or (reading["value"] is not None and not finite_number(reading["value"])):
            raise ValueError("Valor original inválido")
        if not isinstance(reading.get("unit"), str) or not 1 <= len(reading["unit"].strip()) <= 24:
            raise ValueError("Unidad original inválida")
        if "note" in reading and (not isinstance(reading["note"], str) or len(reading["note"]) > 160):
            raise ValueError("Nota original inválida")
    result["turbidity_unit"] = unit
    result["quality"] = {key: quality[key] for key in PARAMETERS}
    result["raw"] = raw
    # Congela el contenido: los reintentos conservarán ID, fecha y valores.
    body = json.dumps(result).encode("utf-8")
    if len(body) > 16384:
        raise ValueError("Lectura demasiado grande")
    return result["reading_id"], body
