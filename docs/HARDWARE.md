# Conexión de sensores ambientales

Placa informada: ESP32_GENERIC, MicroPython 1.28.0. El usuario confirmó lectura DS18B20 y envío HTTP 201. Los nuevos sensores todavía no tienen GPIO ni circuito confirmados.

| Sensor | Entrada y configuración | Presentación |
| --- | --- | --- |
| Temperatura DS18B20 | GPIO 4, adquisición existente conservada | °C, original sin calibrar |
| Humedad del suelo, módulo tipo YL-69/LM393 | AO; `SOIL_GPIO`, `SOIL_ATTENUATION_DB` | ADC 0–65535 |
| Gas MQ-135 | AO; `MQ135_GPIO`, `MQ135_ATTENUATION_DB` | ADC 0–65535, no CO2 ppm |
| Luz, módulo LDR | AO; `LDR_GPIO`, `LDR_ATTENUATION_DB` | ADC 0–65535, no lux |

## Antes de conectar

1. Identifica el modelo real y las etiquetas VCC/GND/AO/DO de cada módulo. Necesitamos una foto legible de los módulos nuevos y los GPIO elegidos. DO es una salida de umbral; no sirve como lectura analógica de esta integración.
2. Desconecta la alimentación antes de cambiar el cableado. Conserva el circuito de temperatura que funciona.
3. Revisa alimentación y tensión máxima de AO. El módulo de suelo descrito por el usuario puede entregar hasta 4,2 V: no conectes esa salida directamente al ESP32. Hace falta verificar o adaptar su nivel. La alimentación admitida por el módulo no implica que su salida sea segura para el ADC.
4. Usa entradas ADC1 independientes y expuestas en tu placa. El adaptador admite GPIO 32–39 del ESP32 original, pero su disponibilidad debe confirmarse en la placa. ADC2 tiene restricciones con Wi-Fi. Comparte GND y revisa cualquier divisor/adaptación con el circuito real, sin adivinar resistencias.
5. Elige la atenuación `0`, `2.5`, `6` u `11` dB según el rango de entrada documentado. La atenuación no protege contra sobretensión. Configura GPIO y atenuación de cada sensor; deja `None` en los que no conectes.
6. Para MQ-135 respeta alimentación, calentamiento y estabilización indicados por su fabricante. Solo después configura `MQ135_STABILIZATION_CONFIRMED = True`. No es un detector selectivo de CO2 ni un dispositivo de seguridad.

## Puesta en marcha manual

Actualiza base, web y firmware en el orden de [SETUP.md](SETUP.md). Ejecuta `run_temperature.py` en Thonny. Compara las lecturas reales de consola con el dashboard del sensor y confirma recepción HTTP 201. Sin conectar los nuevos sensores, temperatura debe continuar y los otros canales mostrar ausencia de datos. Estas comprobaciones quedan pendientes: no se ejecutaron automáticamente.

Para suelo, registra referencias en condiciones conocidas y documenta una conversión antes de presentar un porcentaje. En LDR, la relación entre iluminación y ADC depende del circuito; no asumas su dirección ni la conviertas en lux sin referencia. El firmware conserva originales y no aplica coeficientes introducidos en la web automáticamente. Los datos antiguos no se recalibran al guardar una configuración.

## Documentación técnica

- [MicroPython 1.28, ADC del ESP32](https://docs.micropython.org/en/v1.28.0/esp32/quickref.html#adc-analog-to-digital-conversion).
- [MicroPython, read_u16](https://docs.micropython.org/en/v1.28.0/library/machine.ADC.html).
- [Winsen, MQ-135](https://www.winsen-sensor.com/manual/mq135.html). Confirmar además la ficha del módulo que realmente se use.
