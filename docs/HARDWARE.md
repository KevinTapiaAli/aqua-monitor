# Integración del hardware

El usuario indicó que su compañero aportará el código y los datos del hardware más adelante. No hay firmware previo ni fichas técnicas en el repositorio. No se asignaron GPIO ni se escribieron fórmulas de pH, turbidez o EC.

## Información necesaria

| Elemento | Información a completar |
| --- | --- |
| ESP32 | Modelo exacto de placa/chip, memoria y versión/build de MicroPython |
| pH | Modelo de sonda y módulo, salida/unidades, alimentación, calibración real |
| Temperatura | Modelo, interfaz, precisión y algoritmo ya utilizado |
| Turbidez | Modelo, salida/unidad y evidencia si se expresa en NTU |
| EC | Modelo, constante de celda, conversión válida y compensación térmica si aplica |
| Circuito | Cableado real, GPIO, divisores/protecciones, voltajes medidos y masas |
| Adquisición | Archivos de Thonny, tiempo de estabilización y formato actual de salida |
| Comunicaciones | Red Wi-Fi, memoria libre, soporte TLS/CA/SNI, RTC y timeout DNS |

La denominación “38 pines” no identifica estas características. No energizar ni alterar conexiones basándose en ese dato.

## Reparto recomendado del trabajo

**Plataforma web:** configurar Supabase, aplicar migraciones, registrar cuenta/estación y preparar la URL HTTPS. El token de la estación se comparte con el responsable de hardware por un canal privado.

**Responsable de hardware:** conservar una copia del firmware funcional, documentar el circuito e integrar `read_sensors()` con las funciones existentes. Cada sensor debe controlar su error de forma independiente; una falla no debe convertir los otros tres valores en cero.

**Trabajo conjunto:** verificar reloj, unidades y TLS; confirmar en la API una lectura física; comparar la recepción con Thonny; comprobar desconexión/reintento y deduplicación. Registrar las evidencias en el informe universitario.

## Criterios científicos

- Un número de ADC no es automáticamente pH, NTU o µS/cm.
- Si no hay conversión documentada, almacenar el original con su unidad y marcar `uncalibrated`.
- Registrar la temperatura en °C solo cuando se haya obtenido esa magnitud; no inventar compensación térmica.
- No aplicar coeficientes introducidos en la web a mediciones antiguas sin un proceso explícito de recalculado/trazabilidad.
- Documentar modelos y referencias en el repositorio cuando estén disponibles; los secretos permanecen fuera de Git.
- Evaluar potabilidad requiere otros análisis; esta plataforma no emite esa conclusión.
