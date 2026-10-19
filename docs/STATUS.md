# Estado actual: cambio ambiental — 19/10/2026

- Preparado localmente: dashboards, historial, CSV, configuración, API/tipos y firmware para temperatura, humedad del suelo tipo YL-69, MQ-135 y LDR.
- Temperatura física y HTTP 201 confirmados por el usuario antes de este cambio. Se conserva su adaptador GPIO 4 y su calidad sin calibrar.
- Nuevas entradas opcionales ADC1, desactivadas con GPIO/atenuación `None`; sin datos simulados. Suelo en ADC, no porcentaje; MQ-135 no representa CO2 ppm; LDR no representa lux.
- Nueva migración `202610190001_environmental_sensors.sql`: conserva temperatura y archiva datos de sensores retirados en un esquema privado; mantiene RLS e idempotencia. No aplicada.
- Pendientes: aplicar la migración, publicar, copiar firmware a la placa, identificar módulos/GPIO/voltajes y conectar los sensores nuevos. El paquete privado `.local-run/esp32-temperature` está actualizado sin publicar credenciales.
- Solo revisión estática. No se ejecutaron pruebas, compilación, instalación, servidores ni procesos de fondo para este cambio. La verificación física posterior corresponde a los pasos de SETUP/HARDWARE.

## Registro histórico anterior (no describe el alcance actual)

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
- Módulos MicroPython: contrato, Wi-Fi, RTC UTC por NTP, HTTPS con CERT_REQUIRED y hostname, cola RAM y backoff. Adaptación dirigida a ESP32_GENERIC / MicroPython 1.28.0 informado por el usuario; sin ejecución del firmware integrado por el agente.
- Adaptador de temperatura basado en `IoT_medidor_temp.py`: DS18x20, GPIO 4 y espera de 750 ms. Original preservado en `firmware/reference/`; entrada manual `run_temperature.py`. Sin ejecución ni validación física. Lectura en `raw` mientras no se confirme calibración; pH, turbidez y EC permanecen ausentes.
- Documentación de configuración, arquitectura, permisos, integración física y revisión manual.
- Swagger local en `/swagger` y OpenAPI 3.1 en `/api/openapi`: 12 rutas y 16 operaciones. Esquemas de entrada derivados de Zod y recursos servidos sin CDN.

## Pendiente de información y configuración externa

- El usuario confirmó SQL aplicado, registro/inicio de sesión y estación registrada; mostró acceso al dashboard publicado en https://aqua-monitor-gamma.vercel.app. Clave privada configurada por el usuario; primera ingesta real pendiente.
- Código de pH, turbidez y EC; modelo exacto de la sonda y evidencia de calibración. El usuario confirmó lectura local de temperatura (26,3 °C) en ESP32_GENERIC / MicroPython 1.28.0 con el programa original en Thonny. El adaptador integrado aún no se ha ejecutado en la placa.
- Comprobar adquisición y transporte en la placa: memoria, TLS, RTC, DNS y timeouts. No se ejecutaron pruebas al integrar la temperatura.
- Repositorio GitHub KevinTapiaAli/aqua-monitor conectado y despliegue Vercel realizado por el usuario. Copiar el paquete local .local-run/esp32-temperature a la placa, completar Wi-Fi/token y ejecutar run_temperature.py manualmente.

## Ejecución local autorizada

El usuario solicitó ejecutar el proyecto y obtener las URL de la web y Swagger. Se instalaron las dependencias y se generó `package-lock.json`. Se inició Next.js localmente en el puerto 3000.

- `npm run typecheck`: finalizó correctamente, sin errores.
- `/`: redirigió a `/setup`, que respondió HTTP 200 al faltar configuración Supabase.
- `/login` y `/swagger`: HTTP 200.
- `/api/openapi`: HTTP 200, documento OpenAPI 3.1 con 12 rutas y 16 operaciones.
- JavaScript y CSS de Swagger: HTTP 200, con los tipos de contenido correspondientes.

Son comprobaciones HTTP y de tipos; no se realizó una inspección visual ni una interacción automatizada en navegador.

## Pendiente de verificación

Lint, aislamiento entre usuarios, demás operaciones autenticadas y circuito completo ESP32 → API → PostgreSQL → Realtime. Vercel compiló por acción del usuario; SQL, acceso web y lectura local están respaldados por sus capturas, no por pruebas automatizadas del agente.

El agente no ejecutó build de producción, suites, navegador, capturas ni simulaciones en esta integración. Tampoco envió lecturas ficticias. La puesta en marcha web no equivale a una transmisión física verificada.

## Límites deliberados de la primera versión

- Solo temperatura tiene un adaptador basado en código físico recibido; los otros tres sensores siguen pendientes. No hay valores predeterminados de potabilidad.
- No hay interfaz de invitaciones; asociaciones adicionales se administran explícitamente en Supabase.
- Dashboard: 120 recepciones. Alertas: hasta 50 pendientes por consulta; pueden actualizarse para cargar las siguientes. Dispositivos: hasta 100 visibles. Calibraciones: 100 recientes.
- Historial: periodos de 31 días, páginas de hasta 500; UI hasta unas 5 000 filas. CSV: máximo 10 000 filas por archivo.
- Estadísticas sobre filas cargadas, claramente etiquetadas. No hay agregados históricos precalculados.
- Firmware síncrono con timeouts; cola volátil y pérdida explícita al llenarse/reiniciar. No garantiza muestreo estricto durante una solicitud de red.
- No hay WAF/cuotas globales, retención automática ni exportaciones asíncronas. Se incorporarán según volumen real, sin añadir infraestructura innecesaria.

## Siguiente paso

El usuario confirmó lectura física, conexión Wi-Fi y sincronización UTC mediante los mensajes de Thonny. TLS falla con «The certificate is not correctly signed by the trusted CA» usando ISRG Root X1. Se preparó GTS Root R1 desde https://pki.goog/repo/certs/gtsr1.der en firmware/certs/root-ca.der y en la entrega local; SHA-256 D947432ABDE7B7FA90FC2E6B59101B1280E0E1C7E4E40FA3C6887FFF57A7F4CF, coincidente con la raíz del almacén Mozilla incluido en Node. Google documenta la cadena WR1 → GTS Root R1. La selección para este dominio sigue pendiente de confirmar en la placa: la consulta TLS desde el PC recibió una cadena emitida por Avast, por lo que no demuestra la cadena pública que recibe el ESP32. No se incorporó la raíz de Avast ni se desactivó la verificación TLS.

El usuario confirmó después del reemplazo de CA varias respuestas HTTP 201, estación conectada y lecturas originales visibles en dashboard e historial. También confirmó que la temperatura responde al sostener la sonda. Son comprobaciones físicas realizadas por el usuario, no pruebas automatizadas del agente. Modelo declarado: DS18B20; sin termómetro de referencia, se conserva la calidad sin calibrar. Quedan pendientes reconexión, rechazo de CA/hostname incorrectos, tiempos DNS/TLS y rotación de token en placa.

## Dashboard: señales en tiempo real

La vista general presenta un dashboard por sensor, con temperatura seleccionada inicialmente y navegación a pH, turbidez y conductividad. `src/components/charts/live-sensor-chart.tsx`, integrado en `overview.tsx`, muestra evolución con área y barrido al recibir datos, última lectura, promedio, extremos, desviación estándar poblacional, histograma, cambio entre lecturas consecutivas, distribución de estados y tabla de diez recepciones. Permite seleccionar las últimas 30/60/120 recepciones y analizar originales sin calibrar o lecturas válidas. Las alertas se filtran por sensor; los umbrales configurados se dibujan solo para lecturas válidas de la misma unidad.

Los cálculos están en `src/lib/utils/sensor-analysis.ts`: se separan calidad y unidades, se omiten errores y valores fuera de rango, y las pausas interrumpen la curva y el cálculo de diferencias. Los estados y la tabla incluyen todas las recepciones de la ventana y lo indican explícitamente. Las lecturas originales mantienen línea discontinua y advertencia de calibración. Sensores ausentes esperan datos. Se reutiliza Realtime, sin polling ni simulaciones; se respeta movimiento reducido. El historial conserva su comportamiento anterior. Estas estadísticas describen la ventana cargada, no toda la base de datos.

Revisión únicamente estática por instrucción del usuario; no se ejecutaron pruebas, compilación, servidores ni procesos en segundo plano. Pendiente publicar los cambios web y comprobar manualmente la actualización con el ESP32, la visualización móvil, las interrupciones y los sensores todavía ausentes.
