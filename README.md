# Aqua Monitor

Sistema IoT Multiparamétrico para el Monitoreo en Tiempo Real de la Calidad del Agua.

Aplicación Next.js con Supabase Auth, PostgreSQL/RLS, API REST para ESP32 y dashboard en español. El firmware físico se integra mediante un adaptador: no se han supuesto sensores, GPIO, voltajes ni fórmulas.

## Estado de esta entrega

Código implementado para autenticación, dispositivos, ingesta, alertas, historial, gráficos, CSV y configuración. Incluye migraciones y módulos de comunicación MicroPython. A petición del usuario se instalaron las dependencias, se inició el servidor local y se habilitó Swagger. La revisión TypeScript (`npm run typecheck`) pasó y las rutas web, Swagger, OpenAPI y sus recursos respondieron HTTP 200.

No se provisionó Supabase ni se publicó la aplicación. Siguen pendientes las verificaciones de autenticación/base de datos, interacción en navegador y circuito físico. No se ejecutó una compilación de producción ni suites de pruebas.

## Acceso local

Con el servidor activo en el puerto 3000:

- Web: [http://localhost:3000](http://localhost:3000) (muestra instalación si falta Supabase).
- Inicio de sesión: [http://localhost:3000/login](http://localhost:3000/login).
- Swagger: [http://localhost:3000/swagger](http://localhost:3000/swagger).
- OpenAPI JSON: [http://localhost:3000/api/openapi](http://localhost:3000/api/openapi).

Para volver a iniciarlo después de cerrar el proceso, ejecuta `npm run dev -- --hostname 127.0.0.1 --port 3000`. Son direcciones locales de este equipo, no un despliegue público.

La integración física queda pendiente del código MicroPython, modelos, calibraciones y capacidades TLS de la placa. `firmware/sensor_reader.py` falla explícitamente hasta que se conecten las funciones reales; no genera muestras.

## Puesta en marcha

Sigue [docs/SETUP.md](docs/SETUP.md). En resumen:

1. Prepara Node.js 24 LTS y un proyecto Supabase.
2. Copia `.env.example` a `.env.local` y completa las variables.
3. Aplica las migraciones SQL en orden y configura Supabase Auth.
4. Cuando decidas ejecutar el proyecto, instala con `npm install` e inicia con `npm run dev`.
5. Registra una cuenta, crea un dispositivo y guarda su token privado.
6. Integra las lecturas existentes siguiendo [firmware/README.md](firmware/README.md).

## Organización

```text
src/
  app/                  Rutas, autenticación, pantallas y API v1
  components/           Interfaz organizada por funcionalidad
  hooks/                Suscripciones y sincronización Realtime
  lib/
    api/                Respuestas, errores, cliente y consultas
    auth/               Sesiones y credenciales de dispositivo
    supabase/           Clientes separados: navegador, sesión, ingesta
    utils/              Fechas, estado de conexión y CSV
  config/               Parámetros y etiquetas comunes
  types/                Contratos de dominio y PostgreSQL
supabase/migrations/    Esquema versionado, funciones y permisos
firmware/               Integración MicroPython, sin drivers inventados
docs/                   Instalación, arquitectura, API y comprobación manual
```

## Documentación

| Documento | Contenido |
| --- | --- |
| [Instalación](docs/SETUP.md) | Variables, Supabase, correo, arranque y Vercel |
| [Arquitectura](docs/ARCHITECTURE.md) | Flujo de datos, decisiones y crecimiento |
| [API](docs/API.md) | Endpoints, JSON, calidad y errores |
| [Seguridad](docs/SECURITY.md) | RLS, permisos, credenciales y límites |
| [Hardware](docs/HARDWARE.md) | Información pendiente y distribución del trabajo |
| [Verificación manual](docs/MANUAL_CHECKS.md) | Casos que deben ejecutarse antes de una demostración |
| [Estado](docs/STATUS.md) | Implementado, pendiente y limitaciones |

La aplicación monitorea variables fisicoquímicas. **No certifica potabilidad ni sustituye análisis microbiológicos o de laboratorio.**
