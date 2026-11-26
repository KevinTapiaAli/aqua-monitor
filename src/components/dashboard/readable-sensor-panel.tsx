"use client";
import { useMemo, useState } from "react";
import { useWindowTime } from "@/hooks/use-window-time";
import { StreamingTrace } from "@/components/charts/streaming-trace";
import { sensorSample } from "@/lib/utils/sensor-analysis";
import { sensorHealth } from "@/lib/utils/sensor-health";
import { adcPercent, lightState, type AdcMaximum } from "@/lib/utils/sensor-display";
import { formatDate, formatNumber } from "@/lib/utils/format";
import type { Measurement } from "@/types/domain";

export function ReadableSensorPanel({ rows, parameter, connected, intervalSeconds }: {
  rows: Measurement[]; parameter: "light_adc" | "gas_adc"; connected: boolean; intervalSeconds: number;
}) {
  const [maximum, setMaximum] = useState<AdcMaximum>(65535);
  const [threshold, setThreshold] = useState(50);
  const [minutes, setMinutes] = useState(2);
  const light = parameter === "light_adc";
  const entries = useMemo(() => [...rows].sort((a, b) => Date.parse(a.received_at) - Date.parse(b.received_at) || a.id.localeCompare(b.id)).map(row => {
    const raw = sensorSample(row, parameter)?.value ?? null;
    return { row, raw, time: Date.parse(row.received_at), value: light ? lightState(raw, maximum, threshold) : adcPercent(raw, maximum) };
  }), [rows, parameter, light, maximum, threshold]);
  const points = useMemo(() => entries.map(({ time, value }) => ({ time, value })), [entries]);
  const last = entries.at(-1);
  const value = last?.value ?? null;
  const health = sensorHealth(rows, parameter, maximum, intervalSeconds);
  const end = useWindowTime(connected, last?.time);
  const windowEntries = entries.filter(entry => entry.time >= end - minutes * 60_000 && entry.time <= end);
  const values = windowEntries.flatMap(entry => entry.value === null ? [] : [entry.value]);
  const bands = [values.filter(v => v < 100 / 3).length, values.filter(v => v >= 100 / 3 && v < 200 / 3).length, values.filter(v => v >= 200 / 3).length];
  const state = value === null ? "Sin lectura disponible" : light ? (value === 1 ? "Con luz" : "Oscuro") : value < 100 / 3 ? "Señal baja" : value < 200 / 3 ? "Señal media" : "Señal alta";
  return <section className="panel space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{light ? "Luz · ¿Hay iluminación?" : "Gas · intensidad de la señal"}</h2><span className="badge">{connected ? value === null ? "Sensor sin lectura" : "Datos recibidos" : "Último registro almacenado"}</span></header>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-4xl font-bold tabular-nums">{formatNumber(value, light ? 0 : 1)}{!light && value !== null ? " % de escala" : ""}</p><p className="mt-2 text-lg font-semibold">{state}</p></div><label className="text-sm">Ventana<select value={minutes} onChange={event => setMinutes(Number(event.target.value))}>{[2, 5, 10].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label></div>
    <p className="text-sm muted">{light ? "1 = con luz · 0 = oscuro. Estado calculado desde la señal analógica según el umbral elegido." : "Porcentaje de la escala eléctrica del MQ-135. Baja, media y alta dividen esa escala en tres partes iguales; no indican aire seguro ni concentración de un gas."}</p>
    {health && <div role="status" className="message"><p className="font-semibold">{health.title}</p><p className="mt-1 text-sm">{health.message}</p></div>}
    {light && value !== null && <p className="text-sm muted">Lectura original recibida: {formatNumber(last?.raw, 0)} de {maximum}. {value === 0 ? "Cero es un estado de oscuridad calculado, no un dato ausente." : "Uno es un estado de iluminación calculado."}</p>}
    {last?.raw != null && value === null && <p role="alert" className="message">La lectura no cabe en la escala seleccionada. Revisa los ajustes; no se recorta ni se transforma en cero.</p>}
    <StreamingTrace points={points} color={light ? "#059669" : "#7c3aed"} unit={light ? "estado" : "% de escala"} decimals={light ? 0 : 1} duration={minutes * 60_000} interval={intervalSeconds} connected={connected} step={light} label={light ? "Evolución de luz: 0 oscuro y 1 con luz. Tabla de lecturas debajo." : "Respuesta eléctrica del gas en porcentaje de escala. Tabla debajo."} />
    <p className="text-xs muted">Última recepción: {formatDate(last?.row.received_at)}. Tramo punteado: último valor conocido; no añade mediciones.</p>
    <div className="grid gap-3 sm:grid-cols-3">{(light ? [["Con luz (1)", values.filter(v => v === 1).length], ["Oscuro (0)", values.filter(v => v === 0).length], ["Sin lectura", windowEntries.length - values.length]] : [["Señal baja", bands[0]], ["Señal media", bands[1]], ["Señal alta", bands[2]]]).map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-sm">{label}</p><p className="text-2xl font-semibold">{count} <span className="text-xs muted">lecturas</span></p></div>)}</div>
    <details><summary className="cursor-pointer font-semibold">Ajustar interpretación</summary><div className="mt-3 grid gap-4 sm:grid-cols-2"><label>Escala de los datos recibidos<select value={maximum} onChange={event => setMaximum(Number(event.target.value) as AdcMaximum)}><option value={65535}>0–65535 · lectura ampliada</option><option value={4095}>0–4095 · escala de la guía de conexiones</option></select></label>{light && <label>Umbral de oscuridad: {threshold}%<input type="range" min={1} max={99} value={threshold} onChange={event => setThreshold(Number(event.target.value))} /></label>}</div><p className="mt-3 text-sm muted">Selecciona el máximo que utiliza el programa de la placa: no se puede deducir de una lectura aislada. La escala inicial es 65535, compatible con el contrato existente. Estos ajustes son locales a esta vista y no cambian los datos guardados. En el circuito descrito, el valor aumenta al oscurecerse; por debajo del umbral se muestra 1.</p></details>
    {!light && <details><summary className="cursor-pointer font-semibold">¿Qué gases puede distinguir?</summary><p className="mt-3 text-sm muted">El MQ-135 responde a varias sustancias, entre ellas amoníaco, sulfuros y vapores de la familia del benceno. Su única salida mezcla esas respuestas: no permite separar cuánto hay de cada gas ni calcular CO₂ en ppm con estos datos.</p><a className="mt-2 inline-block text-sm text-cyan-800 underline" href="https://www.winsen-sensor.com/sensors/voc-sensor/mq135.html" target="_blank" rel="noopener noreferrer">Ficha del fabricante</a></details>}
    <details><summary className="cursor-pointer font-semibold">Últimas lecturas y valor original</summary><div className="mt-3 overflow-x-auto"><table><caption className="sr-only">Lecturas con la escala y umbral elegidos</caption><thead><tr><th>Recepción</th><th>{light ? "Estado 0/1" : "% de escala"}</th><th>Original ADC</th></tr></thead><tbody>{entries.slice(-10).reverse().map(entry => <tr key={entry.row.id}><td>{formatDate(entry.row.received_at)}</td><td>{formatNumber(entry.value, light ? 0 : 1)}</td><td>{formatNumber(entry.raw, 0)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
