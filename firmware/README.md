# Capa de integración MicroPython

Esta carpeta integra adquisición y transporte para ESP32_GENERIC / MicroPython 1.28.0. El usuario confirmó DS18B20 en GPIO 4 y envíos HTTP 201. Los nuevos adaptadores analógicos están preparados, sin conexión ni comprobación física todavía.

No se crean `main.py` ni `boot.py`: deben conservarse los que ya funcionan. `sensor_reader.py` es un punto de integración explícito, sin muestras falsas.

## Archivos

| Archivo | Función |
| --- | --- |
| `config.example.py` | Plantilla sin secretos |
| `sensor_reader.py` | DS18B20 y entradas opcionales de suelo, MQ-135 y LDR |
| `payload.py` | Calidad, unidades, JSON y UUID por adquisición |
| `wifi_manager.py` | Reconexión Wi-Fi por pasos, sin espera en bucle |
| `api_client.py` | HTTPS, certificados, límites de respuesta y cierre de sockets |
| `telemetry.py` | Cola en RAM, idempotencia, backoff y manejo de respuestas |
| `integration_runner.py` | Bucle de integración que se invoca explícitamente |

## 1. Conservar adquisición

Copia de seguridad primero. En `read_sensors()`, llama las funciones que tu compañero ya usa. No reemplaces su algoritmo ni cableado.

Devuelve el contrato descrito en [API.md](../docs/API.md), sin `reading_id` ni `measured_at`: `make_payload` los crea una vez. Guarda números sin calibrar en `raw`. Usa `None` y el estado apropiado para ausencias/fallos. `raw` no sustituye los campos principales obligatorios.

Tras integrar las funciones y configurar el dispositivo, puedes conectar explícitamente el bucle desde tu firmware existente:

```python
from integration_runner import run
from sensor_reader import read_sensors

run(read_sensors, on_reading=print)
```

Este fragmento solo muestra el punto de entrada; **no ejecutarlo antes de integrar las lecturas reales**. Si tu programa ya tiene un planificador, utiliza directamente `WifiManager.tick()`, `Telemetry.enqueue()` y `Telemetry.tick()` sin sustituirlo por otro bucle.

## 2. Configuración privada

Copia `config.example.py` como `config.py` en el equipo/placa. Completa SSID, contraseña, hostname HTTPS y token de la estación. `API_HOST` no incluye `https://` ni ruta. `API_PATH` es `/api/v1/ingest`.

`config.py` y `certs/` están ignorados por Git. La placa nunca recibe `service_role`, publishable key de Supabase ni contraseñas de usuarios web.

## 3. TLS y reloj: comprobar en la versión real

La existencia de una URL HTTPS no demuestra validación del servidor. La documentación de [MicroPython SSL](https://docs.micropython.org/en/latest/library/ssl.html) advierte que las capacidades dependen del port y exige hora correcta para CERT_REQUIRED.

El transporte preparado requiere `ssl.SSLContext`, `PROTOCOL_TLS_CLIENT`, `CERT_REQUIRED`, carga de CA mediante `cadata` y verificación de hostname/SNI. Utiliza una CA raíz obtenida de una fuente confiable que valide el certificado del dominio real; no se incluye una CA arbitraria. La compatibilidad exacta debe consultarse en la documentación de la **versión instalada**, no asumirla a partir de `latest`.

En ESP32_GENERIC / MicroPython 1.28.0, `ClockManager` sincroniza RTC por NTP al iniciar, reintenta cada 30 segundos y renueva la hora cada 6 horas. `CLOCK_SYNCED` es estado de ejecución, no una confirmación manual. La entrega local incluye GTS Root R1 descargado de https://pki.goog/repo/certs/gtsr1.der, con huella SHA-256 cotejada con la raíz del almacén Mozilla incluido en Node. Reemplaza la anterior ISRG Root X1; el usuario confirmó después HTTP 201 desde la placa. La consulta desde el PC está interceptada por Avast y no permite confirmar la cadena pública del ESP32. Véase [STATUS.md](../docs/STATUS.md).

Se eliminaron las banderas manuales `TLS_CAPABILITIES_VERIFIED` y `DNS_TIMEOUT_VERIFIED`. El cliente exige realmente `CERT_REQUIRED`, CA y hostname al conectar, y no envía antes de sincronizar el reloj. Esto no constituye una prueba física: siguen pendientes el rechazo de certificados/hostname incorrectos y los tiempos en la placa. DNS depende de lwIP y puede retrasar la adquisición; el timeout TCP no limita `getaddrinfo`.

Si el firmware no ofrece estas capacidades, adaptar el transporte a su versión o evaluar una actualización **después** de respaldar y verificar los drivers. No degradar a HTTP o `CERT_NONE` para que “funcione”.

## 4. Comportamiento ante fallos

- Intervalo inicial: 10 segundos configurable. El bucle conserva adquisición sin Wi-Fi y reintenta la red por pasos.
- Cada adquisición recibe un UUID aleatorio. El JSON se congela al encolar y se reutiliza íntegro en cada intento.
- Cola por defecto: 30 lecturas en RAM, aproximadamente 5 minutos al intervalo de referencia. Al llenarse, descarta la más antigua y aumenta `dropped`; al reiniciar se pierde la cola. Ajustar capacidad con la memoria real.
- Una solicitud HTTPS usa timeouts y un plazo total de referencia de 20 segundos. Es síncrona: puede retrasar temporalmente la siguiente lectura. No se promete adquisición de tiempo real estricto durante el handshake. Un requisito de muestreo más exigente debe resolverse al revisar el firmware físico.
- Fallos de red/5xx: backoff de 2 a 120 segundos; sin ráfagas. Recuperación de pendientes a una lectura cada 2 segundos.
- 429: respeta Retry-After con límite configurado y conserva el cuerpo.
- 400/409/413/415/422: rechaza esa entrada, incrementa `rejected` y permite continuar a las siguientes. Un conflicto de ID requiere investigar el integrador.
- 401/403/404 o redirección: pausa envío; revisar configuración y reanudar con `resume()` tras corregirla.
- Una respuesta 200/201 solo elimina la entrada si incluye el mismo `reading_id` y un `id` de almacenamiento.
- Nunca imprime tokens o cuerpos HTTP de respuesta. Los contadores `dropped`, `rejected` y `last_http_status` están disponibles en `Telemetry` para integrarlos al diagnóstico local.

La cola no es almacenamiento duradero. Antes de una demostración prolongada, documentar cuántas lecturas caben y qué pérdida se acepta; añadir flash/SD solo al conocer memoria, desgaste y alcance.

## 5. Comprobación física pendiente

Identificar componentes → integrar funciones → validar contrato/unidades → comprobar TLS/RTC/DNS → primera lectura física → comparar con Thonny → desconectar/reconectar Wi-Fi → comprobar ID único y eventos → rotar/revocar token.

No ejecutar muestras ficticias en la estación de demostración. Las comprobaciones de contrato se realizan en un proyecto Supabase separado y claramente identificado como pruebas, cuando se autoricen.

## Sensores ambientales

Actualiza primero Supabase y Vercel según [SETUP.md](../docs/SETUP.md). Conserva la adquisición de temperatura. Para los nuevos sensores, configura `SOIL_GPIO`, `MQ135_GPIO`, `LDR_GPIO` y sus respectivos `*_ATTENUATION_DB` solo después de revisar el hardware. `None` deja el canal ausente; se usan entradas ADC1 y `read_u16`. No se usa DHT ni humedad del aire.

El MQ-135 permanece pendiente hasta confirmar su estabilización según la ficha del módulo y configurar `MQ135_STABILIZATION_CONFIRMED = True`. El firmware envía las tres lecturas ADC en `raw`, con calidad `uncalibrated`; la web permite analizarlas como originales. No basta cambiar una bandera para obtener porcentaje, ppm o lux. Consulta [HARDWARE.md](../docs/HARDWARE.md).
