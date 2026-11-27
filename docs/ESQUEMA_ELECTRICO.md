# Esquema eléctrico de Aqua Monitor

**BORRADOR: verificar contra el montaje físico**

La tabla reproduce el pinout y las alimentaciones descritas en el [README](../README.md). Los datos marcados **por confirmar** deben contrastarse con el montaje.

| Componente | Conexión con el ESP32 | Alimentación y referencia | Detalles por confirmar |
| --- | --- | --- | --- |
| ESP32 | Placa central. GPIO 4 para OneWire, GPIO 34 y 35 para entradas analógicas, GPIO 21 y 22 para I²C, GPIO 25, 26 y 27 para RGB. | La fuente y el punto de entrada de alimentación de la placa están **por confirmar**. El montaje documenta conexiones a 3,3 V y masa común. | Modelo exacto de la placa y distribución física de alimentación. |
| DS18B20 | DATA → GPIO 4. Resistencia pull-up de 4,7 kΩ entre DATA y 3,3 V según el README. | 3,3 V y GND común. | Identificación de los conductores de la sonda instalada. |
| LDR de tres pines | S/OUT → GPIO 34. | 3,3 V y GND común. | Modelo del módulo y orden físico de sus terminales. |
| MQ-135 | AO → adaptación de nivel → GPIO 35. | Calentador a 5 V y GND común. La alimentación del módulo específico, aparte del calentador, está **por confirmar**. | Componentes y valores de la adaptación de nivel usada en el montaje. |
| OLED SSD1306 | SDA → GPIO 21. SCL → GPIO 22. | 3,3 V y GND común. | Orden físico de los terminales y dirección I²C del módulo instalado. |
| LED RGB | R → GPIO 25. G → GPIO 26. B → GPIO 27. Cátodo común según el README. | Alimentación desde las salidas GPIO según el esquema informado. Conexión del terminal común y resistencias de cada canal **por confirmar**. | Tipo de LED instalado y componentes en serie. |

El canal analógico del MQ-135 requiere verificar la adaptación real antes de habilitar el sensor. La atenuación del ADC no protege contra sobretensión. Ver [Hardware](HARDWARE.md).
