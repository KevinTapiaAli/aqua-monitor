"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, ChartColumn } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parameterInfo, parameterNotes, qualityLabels } from "@/config/parameters";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { analyzeSensor } from "@/lib/utils/sensor-analysis";
import type { AlertRule, Measurement, Parameter, QualityStatus } from "@/types/domain";

const timeLabel = (value: number) => new Date(value).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/La_Paz" });
const qualityColors: Record<QualityStatus, string> = { ok: "#0d9488", uncalibrated: "#f59e0b", out_of_range: "#e11d48", sensor_error: "#9333ea", missing: "#cbd5e1" };
const tooltipStyle = { borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 };
const tickStyle = { fontSize: 10, fill: "#64748b" };

function Waiting({ text = "Las gráficas aparecerán cuando este sensor envíe lecturas." }: { text?: string }) {
  return <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-6 text-center text-slate-500"><Activity size={30} className="text-slate-300" aria-hidden="true" /><p className="max-w-xs text-sm">{text}</p></div>;
}

export default function LiveSensorChart({ rows, parameter, intervalSeconds, connected, rules }: {
  rows: Measurement[]; parameter: Parameter; intervalSeconds: number; connected: boolean; rules: AlertRule[];
}) {
  const [count, setCount] = useState(60);
  const [mode, setMode] = useState<"auto" | "original" | "valid">("auto");
  const gradientId = useId().replace(/:/g, "");
  const info = parameterInfo[parameter];
  const color = parameter === "temperature_c" ? "#e77754" : info.color;
  const analysis = useMemo(() => analyzeSensor(rows, parameter, count, mode, intervalSeconds), [rows, parameter, count, mode, intervalSeconds]);
  const quality = (Object.keys(qualityColors) as QualityStatus[]).map((key) => ({ key, name: qualityLabels[key], value: analysis.entries.filter(({ row }) => row.quality[parameter] === key).length }));
  const histogram = analysis.histogram.map((bin) => ({ ...bin, label: bin.from === bin.to ? formatNumber(bin.from, info.decimals) : `${formatNumber(bin.from, info.decimals + 1)}–${formatNumber(bin.to, info.decimals + 1)}` }));
  const last = analysis.entries.at(-1);
  const delta = analysis.points.at(-1)?.delta;
  const rule = !analysis.original ? rules.find((r) => r.parameter === parameter && r.enabled && r.unit === analysis.unit) : undefined;
  const hasValues = analysis.values.length > 0;
  const stats = [
    { label: "Promedio", value: analysis.mean, note: "Media de la selección" },
    { label: "Mínima", value: analysis.min, note: "Menor lectura registrada" },
    { label: "Máxima", value: analysis.max, note: "Mayor lectura registrada" },
    { label: "Desviación estándar", value: analysis.deviation, note: "Dispersión de las lecturas" },
  ];

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Análisis del sensor</p><h2 className="mt-2 text-3xl font-bold tracking-tight">{info.label}</h2><p className="mt-2 text-sm muted">Observa su evolución, variación y distribución.</p></div>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs">Ventana<select value={count} onChange={(event) => setCount(Number(event.target.value))}>{[30, 60, 120].map((n) => <option key={n} value={n}>Últimas {n} recepciones</option>)}</select></label>
        <label className="text-xs">Datos analizados<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="auto">Automático según última lectura</option><option value="original">Originales sin calibrar</option><option value="valid">Lecturas válidas</option></select></label>
      </div>
    </header>
    <p className="text-sm muted">{parameterNotes[parameter]}</p>
    <div className={`rounded-xl border px-4 py-3 text-sm ${analysis.original ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600"}`}>
      <strong>{analysis.values.length} lecturas {analysis.original ? "originales sin calibrar" : "válidas"}</strong> de {analysis.entries.length} recepciones seleccionadas · {analysis.unit}. {analysis.original ? "Análisis exploratorio: no implica una calibración confirmada." : "Se excluyen lecturas ausentes, con error o fuera de rango."}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <section className="rounded-2xl bg-[#123446] p-5 text-white shadow-sm">
        <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-medium text-slate-200">Última lectura</h3><span className={`size-2 rounded-full ${connected && analysis.current !== null ? "bg-emerald-400" : "bg-slate-400"}`} aria-hidden="true" /></div>
        <p className="mt-5 text-4xl font-semibold tabular-nums">{formatNumber(analysis.current, info.decimals)} <span className="text-base font-normal text-slate-300">{analysis.unit}</span></p>
        <p className="mt-4 text-xs text-slate-200">{delta != null ? `${delta > 0 ? "+" : ""}${formatNumber(delta, info.decimals)} ${analysis.unit} respecto a la anterior` : "Sin comparación consecutiva"}</p>
        <p className="mt-2 text-[11px] text-slate-300">{analysis.current === null ? "Sin lectura actual en esta selección" : connected ? "Recibiendo datos en vivo" : "Último dato almacenado"}</p>
      </section>
      {stats.map((stat) => <section key={stat.label} className="panel !p-5"><h3 className="text-xs font-medium muted">{stat.label}</h3><p className="mt-5 text-3xl font-semibold tabular-nums" style={{ color }}>{formatNumber(stat.value, info.decimals)} <span className="text-xs font-normal muted">{analysis.unit}</span></p><p className="mt-4 text-[11px] muted">{stat.note}</p></section>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-3">
      <section className="panel min-w-0 xl:col-span-2">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Evolución de {info.label.toLowerCase()}</h3><p className="mt-1 text-xs muted">{analysis.original ? "Lectura original · Línea discontinua" : "Lecturas válidas"} · Intervalo esperado: {intervalSeconds} s</p></div><span className={`badge ${connected && analysis.current !== null ? "badge-ok" : ""}`}><Activity size={12} />{analysis.current === null ? "Sin lectura actual" : connected ? "En vivo" : "Datos almacenados"}</span></div>
        <div className="relative h-80" aria-label={`Gráfica de ${info.label} en ${analysis.unit}. Valores en la tabla de últimas lecturas.`}>
          {hasValues ? <><ResponsiveContainer width="100%" height="100%"><AreaChart data={analysis.points} margin={{ top: 15, right: 15, bottom: 0, left: 0 }} accessibilityLayer>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28} /><stop offset="100%" stopColor={color} stopOpacity={0.01} /></linearGradient></defs>
            <CartesianGrid stroke="#e5edf2" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="time" type="number" domain={[(min: number) => min - intervalSeconds * 500, (max: number) => max + intervalSeconds * 1000]} tickFormatter={timeLabel} minTickGap={60} tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis width={58} domain={[(min: number) => min - Math.max(0.1, Math.abs(min) * 0.01), (max: number) => max + Math.max(0.1, Math.abs(max) * 0.01)]} tickFormatter={(value: number) => formatNumber(value, info.decimals)} tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => timeLabel(Number(label))} formatter={(value) => [`${formatNumber(Number(value), info.decimals)} ${analysis.unit}`, analysis.original ? "Original sin calibrar" : info.label]} />
            {analysis.mean !== null && <ReferenceLine y={analysis.mean} stroke="#94a3b8" strokeDasharray="4 4" />}
            {rule?.min_value != null && <ReferenceLine y={rule.min_value} stroke="#e11d48" strokeDasharray="6 3" ifOverflow="extendDomain" label={{ value: "Umbral mín.", position: "insideTopRight", fontSize: 10 }} />}
            {rule?.max_value != null && <ReferenceLine y={rule.max_value} stroke="#e11d48" strokeDasharray="6 3" ifOverflow="extendDomain" label={{ value: "Umbral máx.", position: "insideBottomRight", fontSize: 10 }} />}
            <Area type="linear" dataKey="value" stroke={color} fill={`url(#${gradientId})`} strokeWidth={2.5} strokeDasharray={analysis.original ? "6 3" : undefined} dot={{ r: analysis.values.length < 3 ? 4 : 1.5 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          </AreaChart></ResponsiveContainer>{connected && analysis.current !== null && <div key={last?.row.id} className="sensor-sweep pointer-events-none absolute inset-y-3 w-px" style={{ backgroundColor: color }} aria-hidden="true" />}</> : <Waiting text="No hay valores para el tipo de datos seleccionado. Si tu sensor aún no está calibrado, selecciona Originales sin calibrar." />}
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] muted"><span>Línea gris: promedio · Eje vertical ajustado a los datos</span><span>Hora de recepción · Bolivia (UTC−4)</span></div>
      </section>
      <section className="panel min-w-0"><h3 className="font-semibold">Estado de las lecturas</h3><p className="mt-1 text-xs muted">Todas las recepciones de la ventana</p>
        <div className="relative h-56">{analysis.entries.length ? <><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={quality.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="85%" paddingAngle={2} stroke="none" isAnimationActive={false}>{quality.filter((item) => item.value > 0).map((item) => <Cell key={item.key} fill={qualityColors[item.key]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl tabular-nums">{analysis.entries.length}</strong><span className="text-xs muted">recepciones</span></div></> : <Waiting />}</div>
        <ul className="space-y-2">{quality.map((item) => <li key={item.key} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: qualityColors[item.key] }} />{item.name}</span><span className="font-semibold tabular-nums">{item.value} <span className="font-normal muted">· {analysis.entries.length ? Math.round(item.value / analysis.entries.length * 100) : 0}%</span></span></li>)}</ul>
      </section>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel min-w-0"><h3 className="flex items-center gap-2 font-semibold"><ChartColumn size={17} style={{ color }} />Distribución de valores</h3><p className="mt-1 text-xs muted">Cuántas lecturas caen en cada intervalo · {analysis.unit}</p><div className="mt-5 h-56">{hasValues ? <ResponsiveContainer width="100%" height="100%"><BarChart data={histogram} margin={{ bottom: 24, right: 10, left: -20 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e5edf2" /><XAxis dataKey="label" tick={{ ...tickStyle, fontSize: 9 }} angle={-15} textAnchor="end" interval={0} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `${label} ${analysis.unit}`} /><Bar dataKey="count" name="Lecturas" fill={color} radius={[5, 5, 0, 0]} maxBarSize={60} isAnimationActive={false} /></BarChart></ResponsiveContainer> : <Waiting />}</div></section>
      <section className="panel min-w-0"><h3 className="font-semibold">Cambio entre lecturas</h3><p className="mt-1 text-xs muted">Diferencia respecto a la recepción anterior · {analysis.unit}</p><div className="mt-5 h-56">{analysis.points.some((point) => point.delta !== null) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.points} margin={{ right: 10, left: -10 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e5edf2" /><XAxis dataKey="time" tickFormatter={timeLabel} minTickGap={55} tick={tickStyle} axisLine={false} tickLine={false} /><YAxis tick={tickStyle} tickFormatter={(value: number) => formatNumber(value, info.decimals)} axisLine={false} tickLine={false} /><ReferenceLine y={0} stroke="#94a3b8" /><Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => timeLabel(Number(label))} formatter={(value) => [`${formatNumber(Number(value), info.decimals)} ${analysis.unit}`, "Cambio"]} /><Bar dataKey="delta" name="Cambio" maxBarSize={14} isAnimationActive={false}>{analysis.points.map((point, index) => <Cell key={`${point.time}-${index}`} fill={(point.delta ?? 0) < 0 ? "#0891b2" : color} />)}</Bar></BarChart></ResponsiveContainer> : <Waiting text="Se necesitan dos lecturas consecutivas comparables para calcular el cambio." />}</div><p className="mt-3 text-[11px] muted">Valores positivos: aumento · Negativos: descenso · Cero: sin cambio. Se omiten interrupciones.</p></section>
    </div>

    <section className="panel min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Últimas lecturas de {info.label.toLowerCase()}</h3><p className="mt-1 text-xs muted">Amplitud de la selección: {formatNumber(analysis.range, info.decimals)} {analysis.unit} · Estadísticas sobre {analysis.values.length} valores de la misma unidad y calidad.</p></div><Link className="flex items-center gap-1 text-xs font-semibold text-cyan-800" href="/dashboard/history">Historial y exportación <ArrowUpRight size={14} /></Link></div>
      <div className="overflow-x-auto"><table><caption className="sr-only">Diez recepciones más recientes del sensor seleccionado, incluyendo ausencias y errores.</caption><thead><tr><th>Recepción (Bolivia)</th><th>Adquisición (Bolivia)</th><th>{info.label}</th><th>Estado</th></tr></thead><tbody>{[...analysis.entries].reverse().slice(0, 10).map(({ row, sample }) => <tr key={row.id}><td className="whitespace-nowrap">{formatDate(row.received_at)}</td><td className="whitespace-nowrap muted">{formatDate(row.measured_at)}</td><td className="whitespace-nowrap font-semibold tabular-nums">{formatNumber(sample?.value, info.decimals)} {sample?.unit ?? info.unit}</td><td><span className={`badge ${row.quality[parameter] === "uncalibrated" ? "badge-warn" : row.quality[parameter] === "ok" ? "badge-ok" : ""}`}>{qualityLabels[row.quality[parameter]]}</span></td></tr>)}{!analysis.entries.length && <tr><td colSpan={4} className="text-center muted">Aún no hay recepciones.</td></tr>}</tbody></table></div>
      <p className="mt-4 text-xs muted">Recepción más reciente: {formatDate(last?.row.received_at)}. La tabla incluye todos los estados; las gráficas respetan el filtro de datos analizados.</p>
    </section>
  </div>;
}
