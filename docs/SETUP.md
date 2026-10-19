# Instalación y despliegue

Supabase, Vercel y la ingesta de temperatura ya fueron configurados y confirmados por el usuario. Para el cambio de sensores sigue la sección siguiente; el resto documenta una instalación nueva.

## Actualización a sensores ambientales (proyecto existente)

Esta actualización cambia el contrato de sensores. Base, web y placa deben usar la misma versión; durante el cambio habrá una pausa de adquisición.

1. En Thonny pulsa **Detener**. No cambies el cableado de temperatura.
2. Abre `supabase/migrations/202610190001_environmental_sensors.sql`. Copia su contenido al SQL Editor del mismo proyecto Supabase y ejecútalo **una sola vez**. No vuelvas a ejecutar las migraciones iniciales. La nueva migración conserva temperatura y archiva los registros anteriores en `private.sensor_transition_20261019`, fuera del acceso web; retira los campos, reglas y calibraciones de los sensores sustituidos. Si aparece un error, detén la actualización y conserva el mensaje; la transacción evita una aplicación parcial.
3. Publica los archivos del cambio en GitHub desde PowerShell, en la raíz del proyecto:

   ```powershell
   git add src firmware docs README.md supabase/migrations/202610190001_environmental_sensors.sql
   git diff --cached --stat
   git commit -m "Cambiar sensores a temperatura suelo gas y luz"
   git push origin main
   ```

   Revisa la lista antes del commit. `.env.local`, `.local-run`, `firmware/config.py` y secretos no deben incluirse. Si vuelve el error de propietario, permite únicamente este repositorio:

   ```powershell
   git config --global --add safe.directory 'C:/Users/Tapia K/OneDrive/Desktop/IOT_MONITOREO CALIDAD DEL AGUA'
   ```

4. Espera a que Vercel termine el despliegue de `main` y muestre **Ready**. No necesitas crear otro proyecto ni modificar las variables existentes para este cambio.
5. En Thonny, desde `.local-run/esp32-temperature`, sube `sensor_reader.py`, `payload.py`, `run_temperature.py` y `config.py` a la raíz del **Dispositivo MicroPython**. Sube también `sensors/analog.py` dentro de `/sensors/`. Conserva `sensors/temperature.py`, el resto de módulos, el certificado, Wi-Fi y token. No sustituyas `main.py` ni `boot.py`.
6. Con los GPIO nuevos en `None`, abre `run_temperature.py` y pulsa **F5**. Comprueba manualmente HTTP 201 y temperatura en la web. Verás espacios para suelo, MQ-135 y LDR sin datos inventados.
7. Identifica y conecta los nuevos módulos siguiendo [HARDWARE.md](HARDWARE.md). Configura sus GPIO/atenuación en `config.py`, vuelve a subirlo y ejecuta el programa. El MQ-135 requiere además confirmar su estabilización real. Comprueba cada nuevo canal en Thonny y en su dashboard antes de presentar.

Las lecturas sin calibrar se muestran como originales. No actives banderas de calibración para ocultar ese estado: faltan referencias físicas para expresar suelo en porcentaje, gas en concentración y luz en lux. La temperatura sigue en °C.

No se ejecutaron estos pasos, builds ni pruebas automáticamente. Las órdenes anteriores son para la publicación manual solicitada.

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
3. `supabase/migrations/202610120003_registration_profiles.sql`
4. `supabase/migrations/202610190001_environmental_sensors.sql`

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

El proyecto está conectado a GitHub `KevinTapiaAli/aqua-monitor` y publicado en `https://aqua-monitor-gamma.vercel.app`. Este cambio local aún debe publicarse.

## Referencias consultadas

- [Supabase SSR y Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Next.js proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Metadatos de Next.js](https://registry.npmjs.org/next/latest) y [React](https://registry.npmjs.org/react/latest)
