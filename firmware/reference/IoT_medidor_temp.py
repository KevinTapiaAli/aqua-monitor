import machine
import onewire
import ds18x20
import time

# Configurar el pin de datos (GPIO 4)
pin_datos = machine.Pin(4)
sensor = ds18x20.DS18X20(onewire.OneWire(pin_datos))

print("Buscando sensor de temperatura...")
roms = sensor.scan()

# Verificar si el ESP32 detecta el sensor físicamente
if not roms:
    print("❌ No se encontró el sensor.")
    print("Revisa que la resistencia de 4.7k haga buen puente entre 3.3V y el cable de datos.")
else:
    print("✅ ¡Sensor encontrado!")
    print("Iniciando lectura en vivo...\n")
    
    # Bucle para leer la temperatura continuamente
    while True:
        try:
            # Ordenar al sensor que tome la medición
            sensor.convert_temp()
            # Obligatorio: esperar 750ms para que el sensor procese la temperatura
            time.sleep_ms(750) 
            
            # Extraer y mostrar el valor
            temperatura = sensor.read_temp(roms[0])
            print("Temperatura actual: {:.1f} °C".format(temperatura))
            
            # Esperar 2 segundos antes de la siguiente medición
            time.sleep(2)
            
        except Exception as e:
            print("Error al leer:", e)
            break