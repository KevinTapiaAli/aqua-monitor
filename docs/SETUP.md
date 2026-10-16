# Instalación y despliegue

La instalación de dependencias, el arranque local y la revisión de tipos se realizaron a petición del usuario. Los pasos de Supabase, correo, hardware y despliegue siguen pendientes.

## 1. Requisitos

- Node.js 24 LTS recomendado; el contrato mínimo del proyecto es Node.js 22.
- Cuenta Supabase con un proyecto PostgreSQL y Auth habilitado.
- Para acceso desde el ESP32: un dominio HTTPS accesible, por ejemplo el despliegue Vercel.
- Para hardware: consultar [HARDWARE.md](HARDWARE.md) antes de modificar la placa.

Next.js y React se fijaron en `16.4.0` y `19.3.0`, consultando los metadatos publicados. Las demás dependencias usan rangos acotados de versiones estables. `package-lock.json` ya fue generado por npm y debe mantenerse en Git. Usa `npm ci` para reproducir esa instalación. Swagger utiliza `swagger-ui-dist`, servido localmente.

## 2. Variables

En PowerShell, desde la carpeta del proyecto:

```powershell
Copy-Item .env.example .env.local
```

Edita `.env.local` sin compartir sus valores:

| Variable | Procedencia | Exposición |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Navegador y servidor |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API publishable key de Supabase | Pública; requiere RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role de Supabase | Solo servidor, ingesta |
| `APP_URL` | Origen exacto, por ejemplo `http://localhost:3000` | Solo servidor |

También puede utilizarse la clave legacy `anon` como valor de la variable pública; **nunca** la clave `service_role`. `APP_URL` debe coincidir con el origen del navegador (incluido puerto). Evita alternar `localhost` y `127.0.0.1` sin actualizarlo.

No coloques la clave privilegiada en nombres `NEXT_PUBLIC_*`. No se necesita una contraseña de PostgreSQL en esta aplicación; los clientes acceden mediante Supabase Data API.

## 3. Base de datos

En el SQL Editor de un proyecto Supabase vacío, ejecuta una vez, en este orden:

1. `supabase/migrations/202610120001_initial_schema.sql`
2. `supabase/migrations/202610120002_validate_sensor_limits.sql`

Cada archivo contiene su propia transacción. No vuelvas a aplicar la migración inicial sobre tablas ya creadas. Si administras migraciones con Supabase CLI, usa su mecanismo de historial en lugar de mezclarlo con ejecuciones manuales; identifica como aplicadas las migraciones que hayas ejecutado previamente.

La primera migración habilita RLS y añade `measurements`, `alerts` y `devices` a la publicación `supabase_realtime`. Confirma que Realtime está habilitado en tu proyecto. No introduzcas datos de prueba en la base que se utilizará para la demostración física.

No hay contraseñas de usuarios en tablas personalizadas. Auth administra sus propios usuarios. El perfil complementario se crea al guardar el nombre; registrar un dispositivo crea automáticamente la asociación del propietario.

## 4. Autenticación y correo

En Supabase Authentication:

- Habilita el proveedor Email y confirmación de correo.
- Configura una longitud mínima de contraseña de 10 caracteres, coherente con la interfaz.
- Define Site URL con el mismo origen de `APP_URL`.
- Añade `http://localhost:3000/auth/callback` y la URL equivalente del despliegue a las Redirect URLs permitidas. Incluye las variantes con `next=/dashboard` y `next=/reset-password` si tu configuración exige coincidencia completa.
- Para correos fuera de las restricciones de envío del entorno de desarrollo de Supabase, configura tu proveedor SMTP en Supabase; no añadas credenciales SMTP al frontend.

Se usa PKCE: abre el enlace de confirmación/recuperación en el **mismo navegador** donde iniciaste la solicitud. Un enlace sin el verificador local dará un error controlado. La ruta callback solo permite destinos internos definidos.

## 5. Instalación local y comprobaciones opcionales

Ejecuta únicamente cuando estés listo para ello:

```powershell
npm install
npm run typecheck
npm run lint
npm run dev
```

Si PowerShell bloquea `npm.ps1`, utiliza `npm.cmd` para esos comandos, sin cambiar globalmente la política de ejecución. Abre `http://localhost:3000` manualmente. La instalación, `typecheck` y el arranque local ya se realizaron; lint y build de producción no se ejecutaron.

En este equipo npm necesitó los certificados del sistema. Con una versión de Node compatible, habilítalos en la terminal de instalación si aparece `UNABLE_TO_VERIFY_LEAF_SIGNATURE`:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm.cmd ci --cache .npm-cache --no-audit --no-fund
```

No desactives `strict-ssl` ni `NODE_TLS_REJECT_UNAUTHORIZED`. La carpeta de caché local está excluida de Git.

Swagger está en `http://localhost:3000/swagger` y el documento OpenAPI en `/api/openapi`. La documentación no necesita Supabase para cargar; las operaciones privadas sí requieren configuración y sesión/token.

Para comprobar la compilación antes del despliegue, ejecuta `npm run build` cuando decidas autorizar esa verificación. Si aparecen incompatibilidades, conserva la salida específica para resolverlas; no actualices indiscriminadamente todas las dependencias.

Flujo inicial: crear cuenta → confirmar correo → iniciar sesión → Dispositivos → registrar estación → guardar token → configurar umbrales solo con referencias apropiadas.

## 6. Vercel

Cuando la revisión y las comprobaciones manuales estén completas:

1. Inicializa o conecta este directorio al repositorio GitHub elegido. Revisa que `.env.local`, `firmware/config.py` y certificados privados no se incluyan.
2. Importa el repositorio en Vercel como Next.js, directorio raíz actual, Node.js 24.
3. Configura las cuatro variables para el entorno correspondiente. `APP_URL` debe ser el dominio exacto de ese despliegue. Repite las Redirect URLs en Supabase.
4. Despliega y completa [MANUAL_CHECKS.md](MANUAL_CHECKS.md).
5. Configura en el ESP32 el dominio HTTPS publicado, la CA correcta y su token individual.

Las previews requieren su propio `APP_URL` y autorización de callback. Una preview con Vercel Authentication no es accesible automáticamente desde el ESP32: utiliza el dominio destinado al dispositivo y la configuración de protección apropiada, manteniendo la autenticación por token de la API.

No se creó un repositorio remoto ni se hizo commit/push/despliegue. La inspección de Git en este entorno devolvió un error de acceso/cambio al directorio del usuario; los archivos del proyecto sí se escribieron en la ruta solicitada.

## Referencias consultadas

- [Supabase SSR y Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Next.js proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Metadatos de Next.js](https://registry.npmjs.org/next/latest) y [React](https://registry.npmjs.org/react/latest)
