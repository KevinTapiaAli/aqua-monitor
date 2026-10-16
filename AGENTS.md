# Reglas del proyecto

Estas reglas resumen las instrucciones del usuario para continuar el desarrollo.

- Trabajar en este repositorio con Next.js App Router, TypeScript estricto, React, Tailwind, Recharts, Supabase Auth/PostgreSQL/RLS/Realtime y MicroPython.
- No ejecutar automáticamente instalaciones innecesarias, servidores, builds, suites, E2E, navegadores, capturas, simulaciones, procesos en segundo plano ni verificaciones funcionales. Requieren una solicitud explícita del usuario. Se permite leer código y realizar análisis estático.
- No presentar revisión estática como prueba funcional. Documentar los comandos/casos manuales que queden pendientes.
- Leer únicamente archivos relevantes; ignorar node_modules, .next, .git y generados. No delegar a agentes paralelos salvo necesidad justificada y autorización aplicable.
- Conservar las funciones físicas de sensores cuando lleguen. Actualmente no hay código original, modelos, GPIO ni versión de MicroPython confirmados. No inventar conexiones, voltajes o calibraciones.
- `firmware/sensor_reader.py` es el punto pendiente de integración; no sustituirlo por valores simulados. Mantener intactos los futuros main.py/boot.py existentes.
- No añadir NestJS, Express, Prisma, Docker, Redis, MQTT, GraphQL o microservicios sin necesidad técnica y aprobación del usuario.
- No usar service_role en navegador o firmware. Solo la ruta de ingesta usa el cliente privilegiado; la identidad se verifica dentro de la RPC antes de escribir.
- Conservar calidad, unidades, raw e idempotencia. No equiparar monitoreo fisicoquímico con potabilidad.
- Cambios de esquema mediante nuevas migraciones SQL, preservando RLS/grants y tipos. No editar una migración ya aplicada en entornos reales.
- Resolver decisiones rutinarias sin pedir confirmación; solicitar información únicamente cuando sea indispensable.
- Al terminar, resumir brevemente lo implementado, archivos relevantes, pendientes, configuración/comprobación manual y siguiente paso.

Consultar `docs/STATUS.md` para distinguir código implementado de configuración y verificación pendientes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
