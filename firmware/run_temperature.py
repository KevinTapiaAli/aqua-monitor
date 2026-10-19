"""Entrada manual para Thonny. No sustituye main.py ni boot.py de la placa."""


def show_reading(readings):
    original = readings["raw"].get("temperature_c", {})
    value = original.get("value")
    quality = readings["quality"]["temperature_c"]
    if value is None:
        print("Temperatura no disponible:", quality)
    else:
        suffix = " (calibracion pendiente)" if quality == "uncalibrated" else ""
        print("Temperatura actual: {:.1f} °C{}".format(value, suffix))
    for parameter, label in (("soil_adc", "Humedad del suelo"), ("gas_adc", "Gas MQ-135"), ("light_adc", "Luz LDR")):
        raw = readings["raw"].get(parameter, {})
        if raw.get("value") is not None:
            print("{}: {} {} ({})".format(label, raw["value"], raw["unit"], readings["quality"][parameter]))
        elif raw:
            print(label, readings["quality"][parameter], raw.get("note", ""))


def main():
    # config.py debe estar configurado en la placa antes de iniciar el transporte.
    import config

    if not config.WIFI_SSID.strip() or not config.DEVICE_TOKEN.startswith("aq_"):
        print("Completa WIFI_SSID, WIFI_PASSWORD y DEVICE_TOKEN en config.py y vuelve a ejecutar.")
        return
    from integration_runner import run
    from sensor_reader import read_sensors

    run(read_sensors, on_reading=show_reading)


if __name__ == "__main__":
    main()
