# Aqua Monitor

Sistema IoT de monitoreo ambiental: temperatura, humedad del suelo, gas MQ-135 y luz LDR.

Aplicación Next.js con Supabase Auth, PostgreSQL/RLS, API REST para ESP32 y dashboard en español. Temperatura DS18B20 integrada; entradas analógicas opcionales preparadas sin asignar conexiones desconocidas.

## Estado de esta entrega

El usuario confirmó lecturas reales de temperatura, HTTP 201 y visualización en Vercel. El cambio ambiental del 19/10 está preparado localmente: interfaz, API, firmware y nueva migración. Falta aplicar esa migración, publicar y actualizar la placa. No se ejecutaron pruebas ni builds para este cambio.

Sigue primero la sección **Actualización a sensores ambientales** de [docs/SETUP.md](docs/SETUP.md).

## Acceso local

Con el servidor activo en el puerto 3000:

- Web: [http://localhost:3000](http://localhost:3000) (muestra instalación si falta Supabase).
- Inicio de sesión: [http://localhost:3000/login](http://localhost:3000/login).
- Swagger: [http://localhost:3000/swagger](http://localhost:3000/swagger).
- OpenAPI JSON: [http://localhost:3000/api/openapi](http://localhost:3000/api/openapi).

Para volver a iniciarlo después de cerrar el proceso, ejecuta `npm run dev -- --hostname 127.0.0.1 --port 3000`. Son direcciones locales de este equipo, no un despliegue público.

Los sensores nuevos permanecen ausentes hasta configurar sus GPIO y atenuación después de revisar el circuito. La temperatura continúa con GPIO 4.

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
