# Comprobaciones manuales pendientes

La instalación, revisión TypeScript y arranque local se realizaron a petición del usuario. Las páginas de instalación/login, Swagger, el documento OpenAPI y los recursos de Swagger respondieron HTTP 200. **Los casos funcionales siguientes siguen pendientes**, salvo lo indicado expresamente; no se comprobaron sesiones reales, PostgreSQL, navegador ni hardware. Ver [STATUS.md](STATUS.md).

Utiliza un proyecto Supabase separado para casos sintéticos. El entorno de demostración recibe solo lecturas físicas. No hace falta instalar un framework de pruebas para esta revisión inicial.

## Código y despliegue

1. Dependencias instaladas y lockfile generado. En un equipo nuevo usa `npm ci`.
2. `npm run typecheck` ya finalizó sin errores. Repetir cuando haya cambios que lo justifiquen.
3. Ejecuta `npm run lint` para revisar React/TypeScript.
4. Ejecuta `npm run build` para comprobar integración App Router y compilación, cuando autorices esa ejecución.
5. Aplica migraciones en un proyecto vacío y comprueba las tablas, índices, grants y publicación Realtime. No se ha verificado el SQL contra PostgreSQL en esta entrega.

## Autenticación

| Caso | Resultado esperado |
| --- | --- |
| Registro y confirmación en el mismo navegador | Cuenta y acceso al panel |
| Correo/contraseña incorrectos | Error controlado, sin detalles internos |
| Ruta dashboard/API sin sesión | Redirección a login / 401 JSON |
| Renovación de sesión | Cookies renovadas y persistencia al navegar |
| Cierre de sesión | Sin acceso a nuevas consultas privadas |
| Recuperación por correo | Cambio de contraseña con sesión válida |
| Callback con `next` externo | No redirige fuera del origen configurado |

## Aislamiento entre usuarios

Crea usuarios A y B y un dispositivo D propiedad de A. Con la sesión B, intenta tanto las rutas Next.js como consultas directas Supabase usando su JWT (nunca service_role):

- No puede leer D, sus mediciones, alertas, calibraciones o reglas.
- No puede editar D, rotar/revocar credenciales ni reconocer sus alertas.
- No puede invocar `ingest_measurement` ni insertar directamente en `measurements` o `alerts`.
- No puede leer `private.device_credentials`, modificar `owner_id`, `last_received_at` o crear su propia asociación.

Como administrador, agrega B a `device_users` de D con rol `viewer` para comprobar consulta y Realtime autorizados. Las mutaciones de propietario deben seguir rechazándose. Después retira esa asociación y repite las consultas. Esto verifica la autorización real, no solo los elementos visibles de la UI.

## Ingesta (entorno separado de pruebas)

| Caso | Resultado esperado |
| --- | --- |
| Token correcto + contrato válido | 201, una fila y timestamp servidor |
| Mismo ID y mismo cuerpo | 200 duplicate; sin duplicar filas, alertas o last_received_at |
| Mismo ID y valores diferentes | 409; no cambia la fila |
| Dos solicitudes simultáneas con el mismo ID | Una fila, una respuesta nueva y una duplicada |
| Token ausente, alterado, revocado o de otro dispositivo | 401; no inserta |
| Dispositivo deshabilitado | 403 |
| Nueva lectura antes de un segundo | 429 + Retry-After; luego permite reintentar |
| JSON inválido / tipo MIME incorrecto | 400 / 415 |
| Campo ausente / cadena en lugar de número / NaN | 422 o 400 si no es JSON válido |
| Valor NULL con quality missing | Conserva ausencia, no cero |
| NTU sin conversión o raw con unidad inválida | 422 según contrato |
| Valor fuera del rango instrumental documentado | 422; no inserta |
| Calidad sensor_error / out_of_range compatible | Evento por sensor en la misma transacción |
| Umbral configurado superado por lectura ok | Alerta con valor, unidad y límites |
| Fallo de base de datos | Error controlado 503/500; sin secretos |

Para solicitudes web manuales de escritura, incluye la sesión y `Origin` igual a `APP_URL`. Para ingesta incluye solo el token de dispositivo, Content-Type y JSON. No escribas tokens en comandos que vayan al historial público o a capturas.

## Interfaz y datos

- Primer usuario sin dispositivos: estado vacío útil.
- Dispositivo creado sin mediciones: “Sin transmisiones”, indicadores vacíos.
- Primera lectura: tarjetas y cuatro gráficos con unidades correctas.
- Suspender envíos más de `max(30, 3 × intervalo)` segundos: “Desconectado”, sin presentar valores históricos como actuales.
- Enviar una lectura pendiente antigua: hora de adquisición distinta de recepción y aviso de antigüedad.
- Desconectar/reconectar Realtime: estado de reconexión y recuperación de la ventana sin duplicados; cambiar de dispositivo no mezcla series.
- Error de sensor: tarjeta explícita, hueco en gráfico y evento; raw accesible en historial.
- Mezclar turbidez V y NTU en periodos diferentes: gráfico separa unidades; promedios físicos excluyen V/ADC.
- Filtrar, cargar páginas y comparar fronteras: sin repeticiones ni pérdidas por empate de timestamp.
- Estadísticas: coinciden con lecturas `ok` cargadas, no con un total de periodo no descargado.
- CSV: columnas de calidad/raw, codificación UTF-8, fechas UTC; periodo grande informa límite y no descarga un archivo incompleto.
- Configuración guardada: persiste tras recargar; reglas afectan nuevas lecturas, sin reescribir historia.
- Móvil/teclado: navegación, foco visible, formularios etiquetados, tabla con scroll horizontal y errores legibles.

## Hardware

Revisa primero [firmware/README.md](../firmware/README.md). Compara los cuatro valores con Thonny y documenta la calibración. Comprueba CA/hostname incorrectos, reloj sin ajustar, timeout, desconexión Wi-Fi, cola llena, reinicio, revocación y rotación. Una pantalla con números no demuestra que las mediciones sean correctas ni que el TLS valide certificados.
