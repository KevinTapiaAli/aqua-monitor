# Capa de integración MicroPython

Esta carpeta añade comunicación alrededor de la adquisición existente. **No es firmware físico terminado ni probado en la placa.** El modelo de ESP32, versión de MicroPython y los sensores todavía se desconocen.

No se crean `main.py` ni `boot.py`: deben conservarse los que ya funcionan. `sensor_reader.py` es un punto de integración explícito, sin muestras falsas.

## Archivos

| Archivo | Función |
| --- | --- |
| `config.example.py` | Plantilla sin secretos |
| `sensor_reader.py` | Adaptador pendiente de funciones físicas reales |
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

Antes de habilitar `TLS_CAPABILITIES_VERIFIED`:

1. Ajusta RTC en UTC usando el mecanismo comprobado para la placa. No se añadió una sincronización NTP automática con supuestos sobre su timeout.
2. Configura `CLOCK_SYNCED = True` solo después de sincronizar; al reiniciar debe repetirse la comprobación. El valor de la plantilla es False.
3. Comprueba conexión al dominio correcto y que un certificado/CA incorrecto y un hostname incorrecto sean rechazados.
4. Comprueba que las operaciones TCP y el handshake respeten el timeout de socket en ese port.
5. Verifica el comportamiento de DNS o configura una dirección IPv4 literal en `API_IP`. Si dependes de DNS, marca `DNS_TIMEOUT_VERIFIED` solo al comprobar que `getaddrinfo` termina dentro de un tiempo aceptable para la adquisición. El timeout de socket no acota necesariamente la resolución DNS.

Sin TLS/reloj verificados o sin DNS acotado/IP, `Telemetry` se pausa y la adquisición puede continuar. No hay opción para aceptar cualquier certificado. Una IP fija sigue usando `API_HOST` para SNI y validación; puede cambiar con el alojamiento y deberá actualizarse. No se recomienda fijarla permanentemente sin conocer la infraestructura.

Si el firmware no ofrece estas capacidades, adaptar el transporte a su versión o evaluar una actualización **después** de respaldar y verificar los drivers. No degradar a HTTP o `CERT_NONE` para que “funcione”.

## 4. Comportamiento ante fallos

- Intervalo inicial: 10 segundos configurable. El bucle conserva adquisición sin Wi-Fi y reintenta la red por pasos.
- Cada adquisición recibe un UUID aleatorio. El JSON se congela al encolar y se reutiliza íntegro en cada intento.
- Cola por defecto: 30 lecturas en RAM, aproximadamente 5 minutos al intervalo de referencia. Al llenarse, descarta la más antigua y aumenta `dropped`; al reiniciar se pierde la cola. Ajustar capacidad con la memoria real.
- Una solicitud HTTPS usa timeouts y un plazo total de referencia de 8 segundos. Es síncrona: puede retrasar temporalmente la siguiente lectura. No se promete adquisición de tiempo real estricto durante el handshake. Un requisito de muestreo más exigente debe resolverse al revisar el firmware físico.
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
