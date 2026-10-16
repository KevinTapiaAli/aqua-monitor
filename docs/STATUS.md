# Estado de implementación

Actualizado: 16 de octubre de 2026 (Bolivia).

## Implementado en código

- Next.js App Router, TypeScript estricto, Tailwind, Lucide y Recharts.
- Registro/login/logout, confirmación PKCE y recuperación de contraseña con Supabase Auth.
- Rutas de dashboard protegidas y APIs autenticadas, con manejo de errores.
- Esquema PostgreSQL versionado: perfiles, estaciones, asociaciones, mediciones, calibraciones, reglas y alertas.
- RLS y permisos por columna; verificadores de tokens en esquema privado.
- Registro de dispositivos, habilitar/deshabilitar, rotar/revocar tokens.
- Ingesta transaccional, validación estricta, deduplicación, rango instrumental configurable y límite por dispositivo.
- Dashboard Realtime, cuatro variables/gráficos, estado de conexión y alertas reconocibles.
- Historial paginado, filtros, estadísticas de registros cargados y CSV de periodo acotado.
- Configuración de perfil, estación, umbrales y evidencia de calibración.
- Módulos MicroPython: contrato, Wi-Fi, HTTPS verificado condicionado a capacidades reales, cola RAM y backoff.
- Adaptador de temperatura basado en `IoT_medidor_temp.py`: DS18x20, GPIO 4 y espera de 750 ms. Original preservado en `firmware/reference/`; entrada manual `run_temperature.py`. Sin ejecución ni validación física. Lectura en `raw` mientras no se confirme calibración; pH, turbidez y EC permanecen ausentes.
- Documentación de configuración, arquitectura, permisos, integración física y revisión manual.
- Swagger local en `/swagger` y OpenAPI 3.1 en `/api/openapi`: 12 rutas y 16 operaciones. Esquemas de entrada derivados de Zod y recursos servidos sin CDN.

## Pendiente de información y configuración externa

- Proyecto Supabase creado y URL/clave publicable configuradas localmente. Falta confirmar aplicación de migraciones y ajustes Auth/correo; credencial privada de ingesta pendiente.
- Código de pH, turbidez y EC; modelo exacto de la sonda de temperatura, versión MicroPython y evidencia de calibración. El GPIO 4 procede del código recibido; la foto no confirma todas las conexiones eléctricas.
- Comprobar adquisición y transporte en la placa: memoria, TLS, RTC, DNS y timeouts. No se ejecutaron pruebas al integrar la temperatura.
- Conectar repositorio GitHub y desplegar en Vercel cuando corresponda.

## Ejecución local autorizada

El usuario solicitó ejecutar el proyecto y obtener las URL de la web y Swagger. Se instalaron las dependencias y se generó `package-lock.json`. Se inició Next.js localmente en el puerto 3000.

- `npm run typecheck`: finalizó correctamente, sin errores.
- `/`: redirigió a `/setup`, que respondió HTTP 200 al faltar configuración Supabase.
- `/login` y `/swagger`: HTTP 200.
- `/api/openapi`: HTTP 200, documento OpenAPI 3.1 con 12 rutas y 16 operaciones.
- JavaScript y CSS de Swagger: HTTP 200, con los tipos de contenido correspondientes.

Son comprobaciones HTTP y de tipos; no se realizó una inspección visual ni una interacción automatizada en navegador.

## Pendiente de verificación

Compilación de producción, lint, ejecución SQL, aislamiento entre usuarios, operaciones autenticadas, interfaz en navegador y circuito completo ESP32 → API → PostgreSQL → Realtime.

No se ejecutaron build de producción, suites, navegador, capturas ni simulaciones. Tampoco se enviaron lecturas ficticias. La puesta en marcha local no equivale a una demostración con sensores verificada.

## Límites deliberados de la primera versión

- Solo temperatura tiene un adaptador basado en código físico recibido; los otros tres sensores siguen pendientes. No hay valores predeterminados de potabilidad.
- No hay interfaz de invitaciones; asociaciones adicionales se administran explícitamente en Supabase.
- Dashboard: 120 recepciones. Alertas: hasta 50 pendientes por consulta; pueden actualizarse para cargar las siguientes. Dispositivos: hasta 100 visibles. Calibraciones: 100 recientes.
- Historial: periodos de 31 días, páginas de hasta 500; UI hasta unas 5 000 filas. CSV: máximo 10 000 filas por archivo.
- Estadísticas sobre filas cargadas, claramente etiquetadas. No hay agregados históricos precalculados.
- Firmware síncrono con timeouts; cola volátil y pérdida explícita al llenarse/reiniciar. No garantiza muestreo estricto durante una solicitud de red.
- No hay WAF/cuotas globales, retención automática ni exportaciones asíncronas. Se incorporarán según volumen real, sin añadir infraestructura innecesaria.

## Siguiente paso

Confirmar el resultado de las migraciones y el acceso en Supabase, identificar la sonda y la versión MicroPython, y preparar una primera transmisión real de temperatura. Integrar los demás sensores cuando se reciban sus funciones. Toda comprobación funcional requiere solicitud del usuario.
