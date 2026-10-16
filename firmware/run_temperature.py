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


def main():
    # config.py debe estar configurado en la placa antes de iniciar el transporte.
    from integration_runner import run
    from sensor_reader import read_sensors

    run(read_sensors, on_reading=show_reading)


if __name__ == "__main__":
    main()
