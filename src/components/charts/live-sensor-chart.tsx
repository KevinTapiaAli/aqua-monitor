"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import { parameterInfo } from "@/config/parameters";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { sensorSample } from "@/lib/utils/sensor-analysis";
import { StreamingTrace } from "./streaming-trace";
import type { Measurement, Parameter } from "@/types/domain";

export default function LiveSensorChart({ rows, parameter, intervalSeconds, connected }: {
  rows: Measurement[]; parameter: Parameter; intervalSeconds: number; connected: boolean;
}) {
  const [minutes, setMinutes] = useState(2);
  const info = parameterInfo[parameter];
  const entries = useMemo(() => [...rows].sort((a, b) => Date.parse(a.received_at) - Date.parse(b.received_at) || a.id.localeCompare(b.id))
    .map(row => ({ row, time: Date.parse(row.received_at), sample: sensorSample(row, parameter) })), [rows, parameter]);
  const last = entries.at(-1);
  const sample = last?.sample;
  const original = sample?.original ?? entries.findLast(entry => entry.sample)?.sample?.original;
  const points = useMemo(() => entries.map(entry => ({ time: entry.time, value: entry.sample?.original === original ? entry.sample?.value ?? null : null })), [entries, original]);
  const end = connected ? Date.now() : last?.time ?? Date.now();
  const values = points.filter(point => point.time >= end - minutes * 60_000 && point.value !== null).map(point => point.value as number);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const previous = entries.at(-2);
  const delta = sample && previous?.sample && sample.original === previous.sample.original && last && last.time - previous.time <= Math.max(30_000, intervalSeconds * 3000) ? sample.value - previous.sample.value : null;
  return <section className="panel min-w-0 !p-4 sm:!p-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-xl font-bold">{info.label}</h2><p className="mt-1 text-xs muted">{parameter === "temperature_c" ? "Temperatura medida por la sonda" : parameter === "gas_adc" ? "Respuesta del MQ-135 · ADC, no CO₂ en ppm" : "Respuesta del LDR · ADC, no lux"}</p></div>
      <span className={connected && sample ? "badge badge-ok" : "badge"}><Activity size={13} />{connected && sample ? "En vivo" : connected ? "Esperando lectura" : "Últimos datos"}</span>
    </header>
    <div className="my-6 flex flex-wrap items-end justify-between gap-6">
      <div><p className="text-xs muted">Última lectura</p><p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums" style={{ color: info.color }}>{formatNumber(sample?.value, info.decimals)} <span className="text-lg font-normal muted">{info.unit}</span></p><p className="mt-2 text-xs muted">{delta === null ? "Esperando lecturas consecutivas" : (delta > 0 ? "+" : "") + formatNumber(delta, info.decimals) + " " + info.unit + " respecto a la anterior"}</p></div>
      <div className="flex flex-wrap gap-6 text-sm"><div><p className="text-xs muted">Mínima</p><p className="mt-1 font-semibold tabular-nums">{formatNumber(min, info.decimals)} {info.unit}</p></div><div><p className="text-xs muted">Máxima</p><p className="mt-1 font-semibold tabular-nums">{formatNumber(max, info.decimals)} {info.unit}</p></div><label className="text-xs">Ventana<select value={minutes} onChange={event => setMinutes(Number(event.target.value))}>{[2, 5, 10].map(value => <option key={value} value={value}>{value} minutos</option>)}</select></label></div>
    </div>
    <StreamingTrace points={points} color={info.color} unit={info.unit} decimals={info.decimals} duration={minutes * 60_000} interval={intervalSeconds} connected={connected} label={"Evolución en tiempo real de " + info.label + ". Valores disponibles debajo en Últimas lecturas."} />
    <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs muted"><span>Puntos: lecturas recibidas · Tramo punteado: último valor en espera</span><span>Hora de recepción · Bolivia</span></div>
    <p className="mt-2 text-xs muted">Última recepción: {formatDate(last?.row.received_at)} · {values.length} valores en la ventana cargada. Las pausas interrumpen la señal.</p>
    <details className="mt-5 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-sm font-medium">Últimas lecturas</summary><div className="mt-3 overflow-x-auto"><table><caption className="sr-only">Cinco lecturas recientes de {info.label}</caption><thead><tr><th>Recepción</th><th>Valor</th></tr></thead><tbody>{entries.slice(-5).reverse().map(entry => <tr key={entry.row.id}><td>{formatDate(entry.row.received_at)}</td><td>{formatNumber(entry.sample?.value, info.decimals)} {info.unit}</td></tr>)}</tbody></table></div></details>
    <Link className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-800" href="/dashboard/history">Historial completo <ArrowUpRight size={14} /></Link>
  </section>;
}
