# Seguridad y permisos

## Identidades independientes

Los usuarios se autentican mediante Supabase Auth con sesiones SSR. El servidor verifica la sesión con `getUser`; `proxy.ts` renueva tokens con `getClaims`. No se confía en un `getSession` recibido de cookies como prueba de identidad. El cliente de navegador necesita las cookies para Realtime; esta integración estándar no se presenta como una sesión compuesta exclusivamente por cookies HttpOnly.

El ESP32 no usa una cuenta humana: recibe un token `aq_<uuid_dispositivo>.<secreto_aleatorio>`. Solo se muestra al crear/rotar. PostgreSQL guarda el hash SHA-256 de un secreto de 256 bits, apropiado para un token aleatorio de alta entropía; no es un sistema de hash de contraseñas humanas.

## Matriz de permisos

| Recurso | Propietario | Lector asociado | Anónimo/dispositivo |
| --- | --- | --- | --- |
| Perfil propio | Leer, crear, cambiar nombre | Igual para su propio perfil | Sin acceso |
| Dispositivo asociado | Leer; editar campos administrativos/especificaciones | Leer | Sin acceso directo |
| Membresías | Consultar asociaciones de su dispositivo | Consultar su asociación | Sin acceso |
| Mediciones | Leer | Leer | Solo ingesta validada mediante API |
| Reglas | Leer, crear y editar límites | Leer | Sin acceso |
| Calibraciones | Leer y agregar evidencia | Leer | Sin acceso |
| Alertas | Leer y reconocer mediante RPC | Leer | Sin acceso |
| Credenciales privadas | Crear/rotar/revocar mediante RPC | Sin acceso | Sin lectura del verificador |

Las tablas públicas tienen RLS explícito y grants por columna en mutaciones. No se permite cambiar `owner_id`, `last_received_at`, autoría o IDs mediante PATCH. Mediciones y alertas no tienen políticas de inserción desde el navegador.

Los helpers SECURITY DEFINER fijan `search_path = ''`, usan nombres de tabla calificados y comparan contra `auth.uid()`. No aceptan un UUID de usuario para fingir una sesión. Los permisos por defecto de ejecución PUBLIC se revocan para las funciones del proyecto.

## Operaciones privilegiadas

Únicamente `/api/v1/ingest` importa `ingestionClient()`, protegido con `server-only`. Usa `service_role` para invocar `ingest_measurement`. Esa función exige identidad/token y estado activo **antes** de insertar y solo puede invocarla `service_role` (además del administrador de PostgreSQL).

RLS no limita a `service_role`; por eso es esencial mantener esa credencial exclusivamente en el servidor. La autorización de ingesta está dentro de la RPC, no depende de un `device_id` libre enviado por el ESP32.

Registro de dispositivos, rotación de credenciales y reconocimiento de alertas utilizan el cliente con sesión del usuario y funciones SECURITY DEFINER que verifican identidad/propiedad. No utilizan la clave privilegiada en la ruta web.

## Controles implementados

- HTTPS requerido por el transporte firmware; sin fallback a HTTP ni redirecciones que reenvíen el token.
- Zod estricto, números finitos y coherencia entre calidad, valores y unidades.
- Restricciones SQL e índices para reforzar integridad, idempotencia y límites instrumentales.
- Cuerpos JSON de hasta 16 KiB, consultas acotadas y paginación por cursor validado.
- `Origin` igual a `APP_URL` en escrituras web; Server Actions conservan la protección de origen de Next.js.
- Respuestas privadas sin caché compartida, incluidos errores y respuestas con credenciales.
- Sesiones independientes de tokens de placa. Revocar uno no revela ni afecta tokens de otras estaciones.
- Exportación CSV que neutraliza texto que pueda interpretarse como fórmula.
- No hay logs de tokens, contraseñas, cuerpos completos o errores crudos de Supabase.

## Límites explícitos

El límite de una inserción nueva por segundo/dispositivo es consistente en PostgreSQL; no es un firewall ni un límite por IP. Las solicitudes inválidas aún consumen trabajo de API. Para una publicación masiva, definir cuotas, protección de tráfico y política de alta de cuentas con la plataforma, según necesidades reales.

Auth limita sus propias solicitudes; configurar sus políticas de envío/abuso en Supabase. No se ha instalado CAPTCHA ni otro proveedor. Las altas de dispositivos no tienen una cuota comercial; la UI inicial muestra los 100 más recientes autorizados.

Un usuario asociado puede ver lo que RLS permite. El filtro del canal Realtime **no sustituye** a RLS. Antes de usar el sistema, ejecutar los casos entre dos usuarios de [MANUAL_CHECKS.md](MANUAL_CHECKS.md).

No hay interfaz de invitaciones en esta entrega. `device_users` permite lectores adicionales; un administrador puede asignarlos en Supabase comprobando explícitamente el usuario y el dispositivo. No permitir a usuarios editar esa tabla directamente ni asignar `owner` como atajo. Una futura interfaz de invitaciones debe usar una RPC que valide propiedad.

Las claves almacenadas en un ESP32 físico pueden extraerse si su almacenamiento no está protegido. La defensa incluida es una credencial individual revocable y con un único alcance. La protección física/flash requiere conocer el modelo y el firmware real.

Consulta [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) y [Realtime/RLS](https://supabase.com/docs/guides/realtime/postgres-changes) para la configuración del servicio. El uso de estas APIs no sustituye la comprobación del despliegue concreto.
