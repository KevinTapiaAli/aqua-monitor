"""Ejecutar manualmente en Thonny con aqua_real detenido.

Solo diagnóstico local. No importa credenciales ni escribe/envía mediciones.
No su
stituye main.py, boot.py ni aqua_real.py. Pines de la guía del usuario.
"""
from machine import Pin, ADC, I2C
import time
import onewire
import ds18x20


def temperatura():
    print("\n1. TEMPERATURA - GPIO 4")
    try:
        sensor = ds18x20.DS18X20(onewire.OneWire(Pin(4)))
        roms = sensor.scan()
        print("Sondas detectadas:", len(roms))
        if not roms:
            print("NO DETECTADA. Revisar VCC, GND, DATA GPIO 4 y pull-up 4.7 kohm.")
            return
        sensor.convert_temp()
        time.sleep_ms(750)
        for index, rom in enumerate(roms):
            try:
                value = sensor.read_temp(rom)
                print("Sonda", index + 1, "temperatura:", value, "C")
            except Exception as error:
                print("Error al leer sonda:", type(error).__name__, str(error))
    except Exception as error:
        print("Error OneWire:", type(error).__name__, str(error))


def pantalla():
    print("\n4. PANTALLA - SDA 21 / SCL 22 (opcional)")
    answer = input("Enter omite la pantalla; escribe SI solo para revisar I2C: ")
    if answer.strip().upper() != "SI":
        print("Pantalla omitida. Las comprobaciones de sensores ya terminaron.")
        return
    try:
        bus = I2C(0, sda=Pin(21), scl=Pin(22), freq=100000)
        addresses = bus.scan()
        print("Direcciones I2C:", [hex(address) for address in addresses])
        if 0x3c in addresses:
            print("Responde un dispositivo en 0x3c, direccion esperada de OLED.")
        elif 0x3d in addresses:
            print("Responde 0x3d. Revisar direccion configurada del controlador OLED.")
        else:
            print("Sin respuesta OLED esperada. Revisar 3.3V, GND, SDA y SCL.")
    except Exception as error:
        print("Error I2C:", type(error).__name__, str(error))


def muestra_adc(adc, label):
    values = [adc.read_u16()]
    for _ in range(7):
        time.sleep_ms(100)
        values.append(adc.read_u16())
    print(label, values)
    print("Minimo:", min(values), "Maximo:", max(values))
    return sum(values) / len(values)


def luz():
    print("\n2. LUZ - GPIO 34, escala 0 a 65535")
    try:
        adc = ADC(Pin(34))
        adc.atten(ADC.ATTN_11DB)
        input("Deja el LDR iluminado y pulsa Enter: ")
        iluminado = muestra_adc(adc, "Con luz:")
        input("Tapa solo el LDR y pulsa Enter: ")
        oscuro = muestra_adc(adc, "Tapado:")
        print("Promedios: iluminado =", iluminado, "; tapado =", oscuro)
        if iluminado == oscuro:
            print("Sin diferencia en esta comprobacion. Revisar modulo y conexiones.")
        elif oscuro > iluminado:
            print("El ADC sube al oscurecer: coincide con la interpretacion web actual.")
        else:
            print("El ADC baja al oscurecer: informar este resultado para ajustar la web.")
        print("No se cambia el umbral ni se guardan estas muestras.")
    except Exception as error:
        print("Error LDR:", type(error).__name__, str(error))


def gas():
    print("\n3. GAS - GPIO 35")
    print("Sin exponer a gases ni soplar. Esta lectura no comprueba seguridad electrica.")
    answer = input("Si la entrada con divisor ya fue verificada, escribe SI para leer; Enter omite: ")
    if answer.strip().upper() != "SI":
        print("Lectura de gas omitida.")
        return
    try:
        adc = ADC(Pin(35))
        adc.atten(ADC.ATTN_11DB)
        muestra_adc(adc, "Gas ADC:")
    except Exception as error:
        print("Error MQ135:", type(error).__name__, str(error))


def main():
    print("=== DIAGNOSTICO LOCAL: NO ENVIA DATOS ===")
    print("Reloj que la placa trata como UTC:", time.gmtime()[:6])
    temperatura()
    luz()
    gas()
    pantalla()
    print("\n=== FIN. Copia estos resultados, sin config.py ni credenciales. ===")
    print("Para volver al monitoreo, abre aqua_real.py y pulsa F5.")


if __name__ == "__main__":
    main()
