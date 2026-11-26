import type { Measurement, Parameter } from "@/types/domain";
import { sensorSample } from "./sensor-analysis";

export function sensorHealth(rows: Measurement[], parameter: Parameter, maximum = 65535, intervalSeconds = 10): { title: string; message: string } | null {
  const recent = [...rows].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at)).slice(0, 8);
  const latest = recent[0];
  if (!latest) return null;
  const sample = sensorSample(latest, parameter);
  if (!sample) {
    if (latest.quality[parameter] === "sensor_error") return {
      title: "El dispositivo informa un error de sensor",
      message: parameter === "temperature_c" ? "No llegó una temperatura numérica. Revisa la detección del DS18B20 en Thonny, su alimentación, el cable de datos GPIO 4 y la resistencia de 4,7 kΩ. Desconecta la alimentación antes de ajustar cables." : "Esta recepción no contiene una lectura utilizable de este sensor. Revisa la consola de la placa; la conexión a Internet puede seguir funcionando.",
    };
    return { title: "Sin lectura utilizable en la última recepción", message: "No se sustituye el dato por cero ni por una lectura antigua. Consulta el estado del sensor en Thonny." };
  }
  if (parameter === "temperature_c") return null;
  // Las comprobaciones de saturación y saltos requieren recepciones cercanas para que una pausa no parezca un fallo del sensor.
  const contiguous = recent.every((row, i) => i === 0 || Date.parse(recent[i - 1].received_at) - Date.parse(row.received_at) <= Math.max(30, intervalSeconds * 3) * 1000);
  const values = recent.map(row => sensorSample(row, parameter)?.value ?? null);
  if (contiguous && values.length >= 3 && values.slice(0, 3).every(value => value === maximum)) return {
    title: "La señal está en el máximo de lectura",
    message: parameter === "light_adc" ? "La luz sí está llegando, pero las últimas tres lecturas son iguales al máximo. Ilumina y tapa el sensor: si el valor no cambia, revisa alimentación, GND y OUT en GPIO 34. El estado 0 no significa que falten datos." : "El sensor está en el límite de la escala seleccionada. Revisa alimentación y adaptación de la entrada; este límite no identifica un gas ni su concentración.",
  };
  if (parameter === "gas_adc" && contiguous && values.length >= 5 && values.every(value => value !== null && value >= 0 && value <= maximum)) {
    let jumps = 0;
    for (let i = 1; i < values.length; i++) if (Math.abs(values[i]! - values[i - 1]!) > maximum / 2) jumps++;
    if (jumps >= 2) return { title: "Cambios bruscos de señal", message: "Se observan varios saltos mayores a la mitad de la escala entre recepciones consecutivas. Revisa conexiones, alimentación y estabilización del MQ-135 antes de interpretar la tendencia. Este aviso describe los datos; no diagnostica un gas." };
  }
  return null;
}
