# API REST v1

## Swagger interactivo

Con el servidor local activo:

- Interfaz Swagger: `http://localhost:3000/swagger`.
- Documento OpenAPI 3.1: `http://localhost:3000/api/openapi`.

Los esquemas de entrada se generan a partir de los mismos validadores Zod de la API. Las validaciones entre campos y los límites temporales se explican además en cada operación. Swagger y sus recursos JavaScript/CSS se sirven desde esta aplicación, sin CDN.

Para operaciones de usuario, inicia sesión en `/login` en el mismo navegador. Para la ingesta, usa **Authorize → DeviceToken** con el token individual `aq_...`, sin escribir `Bearer` antes. No uses claves Supabase en Swagger. La autorización no se conserva en localStorage. **Try it out** realiza operaciones reales; utiliza una estación y base de pruebas para los ejemplos.

La documentación puede abrirse antes de configurar Supabase. Las operaciones privadas siguen exigiendo su configuración y autenticación; Swagger no las omite.

## Contrato general

Todas las respuestas usan `Cache-Control: private, no-store` (errores: `no-store`). El cliente web usa la sesión de Supabase SSR en cookies. Las operaciones de escritura web exigen el encabezado `Origin` igual a `APP_URL`. La ingesta usa exclusivamente `Authorization: Bearer <token_del_dispositivo>` y no exige cookies u origen.

## Endpoints

| Método y ruta | Entrada | Permiso |
| --- | --- | --- |
| `POST /api/v1/ingest` | JSON de lectura; máximo 16 KiB | Token de dispositivo activo |
| `GET /api/v1/measurements` | `device_id`, `from`, `to`, `limit`, `cursor` | Usuario asociado, RLS |
| `GET /api/v1/measurements/latest` | `device_id` | Usuario asociado, RLS |
| `GET /api/v1/devices` | — | Usuario; hasta 100 autorizados |
| `POST /api/v1/devices` | `name`, `location`, `expected_interval_seconds` | Usuario; se convierte en propietario |
| `PATCH /api/v1/devices/{id}` | Campos editables, `is_active`, `sensor_limits` | Propietario |
| `GET /api/v1/devices/status` | `device_id` | Usuario asociado |
| `POST /api/v1/devices/{id}/credentials` | — | Propietario; rota y revela nuevo token una vez |
| `DELETE /api/v1/devices/{id}/credentials` | — | Propietario; revoca |
| `GET /api/v1/alerts` | `device_id` | Usuario asociado; 50 pendientes más recientes |
| `POST /api/v1/alerts/{id}/acknowledge` | — | Propietario |
| `GET /api/v1/alert-rules` | `device_id` | Usuario asociado |
| `PUT /api/v1/alert-rules` | `device_id`, `parameter`, `min_value`, `max_value`, `enabled` | Propietario |
| `GET /api/v1/calibrations` | `device_id` | Usuario asociado; 100 más recientes |
| `POST /api/v1/calibrations` | Ver formulario Configuración | Propietario |
| `PUT /api/v1/profile` | `display_name` | Usuario sobre su propio perfil |

Las consultas sin permiso devuelven listas vacías o `data: null`; no revelan si un UUID ajeno existe. Las modificaciones no autorizadas se rechazan con 403/404 o el error controlado del proveedor. Los endpoints no aceptan `user_id` para suplantar la identidad.

## Contrato de ingesta

Ejemplo documental de **ausencia de datos**, no una medición ni un seed. No enviarlo al proyecto de demostración como lectura física:

```json
{
  "reading_id": "772405ad-699d-4e58-9bbc-02404a726dd3",
  "measured_at": null,
  "soil_adc": null,
  "temperature_c": null,
  "gas_adc": null,
  "light_adc": null,
  "quality": {
    "soil_adc": "missing",
    "temperature_c": "missing",
    "gas_adc": "missing",
    "light_adc": "missing"
  },
  "raw": {}
}
```

Todos los campos principales son obligatorios. Omitir uno da 422. `null` es una ausencia explícita, no cero. El `device_id` se obtiene del token; no se acepta en el cuerpo. Los campos desconocidos también se rechazan.

`reading_id` debe ser un UUID nuevo por adquisición. Conserva ese UUID y el contenido íntegro al reintentar. `measured_at` es ISO 8601 con zona horaria, o `null`; se rechazan fechas anteriores a 2020 y más de 5 minutos en el futuro. Los registros pendientes antiguos no tienen límite de antigüedad adicional.

### Calidad por parámetro

| Estado | Valor principal | Uso |
| --- | --- | --- |
| `ok` | Número finito | Conversión física válida y lectura aceptada por el adaptador |
| `out_of_range` | Número finito | Lectura que el adaptador identifica como fuera de su condición válida; genera evento |
| `uncalibrated` | NULL | Conversión física/calibración pendiente; conservar original en `raw` |
| `sensor_error` | NULL | Fallo de sensor; genera evento |
| `missing` | NULL | Dato no disponible; no inventa lectura |

`ok` no certifica exactitud metrológica; el responsable debe documentar la conversión real en firmware. Los límites de la ficha técnica configurados se aplican **incluso** a estados `out_of_range`; si el sensor informa una condición que no permite un valor físico válido, envía NULL + `sensor_error` y su dato original.

Unidades: `temperature_c` en °C; `soil_adc`, `gas_adc` y `light_adc` en ADC entero de 0 a 65535 (`read_u16`). El suelo no se expresa en porcentaje; MQ-135 no se presenta como CO2 ppm y LDR no se presenta en lux.

`raw` es un objeto opcionalmente vacío con claves entre los cuatro parámetros. Cada entrada contiene `value` numérico finito o NULL, `unit` de 1–24 caracteres y `note` opcional de hasta 160 caracteres. Se preserva sin usarla para certificar calidad o activar umbrales físicos.

La validación rechaza temperatura bajo el cero absoluto, ADC fraccionario o fuera de 0–65535, infinitos, NaN, booleanos y cadenas numéricas, también dentro de `raw`. Cada original debe usar la unidad indicada para su parámetro. `uncalibrated` exige valor principal NULL y valor original presente.

### Respuestas

```json
{
  "data": {
    "id": "a210719c-e83c-45b3-8098-8b6e7856ed08",
    "reading_id": "772405ad-699d-4e58-9bbc-02404a726dd3",
    "received_at": "2026-10-12T12:00:00+00:00",
    "duplicate": false
  }
}
```

201: inserción nueva. 200 con `duplicate: true`: el mismo contenido ya estaba confirmado. Reusar el ID con otro contenido produce 409. Un duplicado no crea eventos adicionales ni adelanta `last_received_at`.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los campos enviados.",
    "details": [{ "field": "soil_adc", "message": "Este estado requiere un valor numérico." }]
  }
}
```

| HTTP | Acción del integrador |
| --- | --- |
| 400 / 415 | Corregir JSON / Content-Type |
| 401 | Revisar token; pausar envío hasta corregir |
| 403 | Revisar revocación, estado administrativo y permisos |
| 409 | Revisar reuso de reading_id; no reemplazar la fila existente |
| 413 | Reducir tamaño; máximo 16 KiB |
| 422 | Corregir contrato, calidad, fecha o rango de sensor |
| 429 | Respetar Retry-After y reintentar el mismo cuerpo |
| 500 / 503 / fallo de red | Reintento acotado con backoff, mismo ID y contenido |

## Historial

```http
GET /api/v1/measurements?device_id=UUID&from=2026-10-11T00:00:00Z&to=2026-10-12T00:00:00Z&limit=120
```

```json
{ "data": { "items": [], "next_cursor": null, "limit": 120 } }
```

Periodo por **recepción**, inicio incluido y final excluido. Deben enviarse ambas fechas o ninguna; máximo 31 días con fechas. Sin fechas se obtiene la ventana más reciente. `limit` entre 1 y 500, por defecto 120. Orden descendente `(received_at, id)`; la interfaz invierte para graficar. Repite la misma consulta con `cursor` igual al `next_cursor` opaco recibido. No se usa offset.

`/latest` devuelve la última recepción autorizada o NULL. `/status` distingue `online`, `offline`, `waiting` y `disabled`. Conectado exige una recepción en los últimos `max(30, 3 × intervalo)` segundos. La hora de adquisición puede ser anterior y se muestra separadamente.
