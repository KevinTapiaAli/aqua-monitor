"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parameterInfo } from "@/config/parameters";
import { formatNumber } from "@/lib/utils/format";
import type { Measurement, Parameter } from "@/types/domain";

type Sample = { value: number; unit: string; original: boolean };

function sampleFor(row: Measurement, parameter: Parameter): Sample | null {
  const quality = row.quality[parameter];
  if (quality !== "ok" && quality !== "uncalibrated") return null;
  let value: unknown = row[parameter];
  let unit: unknown = parameter === "turbidity_value" ? row.turbidity_unit : parameterInfo[parameter].unit;
  if (quality === "uncalibrated" && value == null) {
    const raw = row.raw;
    const entry = raw && typeof raw === "object" && !Array.isArray(raw) ? raw[parameter] : null;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    value = entry.value;
    unit = entry.unit;
  }
  const allowedUnits = parameter === "turbidity_value" ? ["NTU", "V", "ADC"] : [parameterInfo[parameter].unit];
  if (typeof value !== "number" || !Number.isFinite(value) || typeof unit !== "string" || !allowedUnits.includes(unit)) return null;
  return { value, unit, original: quality === "uncalibrated" };
}

const timeLabel = (value: number) => new Date(value).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/La_Paz" });

export default function LiveSensorChart({ rows, parameter, intervalSeconds, connected }: {
  rows: Measurement[];
  parameter: Parameter;
  intervalSeconds: number;
  connected: boolean;
}) {
  const info = parameterInfo[parameter];
  const data = useMemo(() => {
    const sorted = [...rows].sort((a, b) => Date.parse(a.received_at) - Date.parse(b.received_at) || a.id.localeCompare(b.id)).slice(-120);
    const samples = sorted.map((row) => ({ time: Date.parse(row.received_at), sample: sampleFor(row, parameter) }));
    const current = samples.at(-1)?.sample ?? null;
    const mostRecent = samples.findLast((item) => item.sample !== null)?.sample;
    const unit = current?.unit ?? mostRecent?.unit ?? info.unit;
    const original = current?.original ?? mostRecent?.original ?? false;
    const end = samples.at(-1)?.time ?? 0;
    const span = Math.max(60, intervalSeconds * 119) * 1000;
    const start = end - span;
    const visible = samples.filter((item) => item.time >= start);
    const values: number[] = [];
    const points: { time: number; valid: number | null; original: number | null }[] = [];
    let previousTime: number | undefined;
    for (const item of visible) {
      if (previousTime !== undefined && item.time - previousTime > Math.max(30, intervalSeconds * 3) * 1000) {
        points.push({ time: previousTime + 1, valid: null, original: null });
      }
      const sample = item.sample?.unit === unit ? item.sample : null;
      points.push({ time: item.time, valid: sample && !sample.original ? sample.value : null, original: sample?.original ? sample.value : null });
      if (sample && sample.original === original) values.push(sample.value);
      previousTime = item.time;
    }
    return { points, current, unit, original, start, end, values, hasValues: points.some((p) => p.valid !== null || p.original !== null) };
  }, [rows, parameter, intervalSeconds, info.unit]);
  const stats = data.values.length ? [Math.min(...data.values), data.values.reduce((sum, value) => sum + value, 0) / data.values.length, Math.max(...data.values)] : [null, null, null];

  return <section className="panel min-w-0 overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2"><Activity size={18} style={{ color: info.color }} aria-hidden="true" /><h3 className="font-semibold">{info.label}</h3></div>
      <span className={`badge ${data.current && connected ? "badge-ok" : ""}`}>{!data.current ? "Sin lectura actual" : connected ? "En vivo" : "Últimos datos"}</span>
    </div>
    <div className="my-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <strong className="text-3xl font-semibold tabular-nums" style={{ color: info.color }}>{formatNumber(data.current?.value, info.decimals)}</strong>
      <span className="text-sm muted">{data.unit}</span>
      {data.current?.original && <span className="badge badge-warn">Original · Sin calibrar</span>}
    </div>
    <div className="relative h-56 rounded-xl border border-slate-100 bg-slate-50/60 p-2" role="img" aria-label={`${info.label}: ${data.current ? `${formatNumber(data.current.value, info.decimals)} ${data.unit}${data.current.original ? ", sin calibrar" : ""}` : "sin lectura actual"}. Evolución por hora de recepción; valores disponibles en Historial.`}>
      {data.hasValues ? <>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke="#dce7ed" strokeDasharray="2 4" />
            <XAxis dataKey="time" type="number" domain={[data.start, data.end + intervalSeconds * 1000]} tickFormatter={timeLabel} minTickGap={55} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis width={54} domain={[(min: number) => min - Math.max(0.1, Math.abs(min) * 0.01), (max: number) => max + Math.max(0.1, Math.abs(max) * 0.01)]} tickFormatter={(value: number) => formatNumber(value, info.decimals)} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
            <Tooltip labelFormatter={(label) => timeLabel(Number(label))} formatter={(value, name) => [`${formatNumber(Number(value), info.decimals)} ${data.unit}`, name]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Line type="linear" dataKey="valid" name="Lectura válida" stroke={info.color} strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
            <Line type="linear" dataKey="original" name="Original · Sin calibrar" stroke={info.color} strokeDasharray="5 3" strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
            {data.current && <ReferenceDot x={data.end} y={data.current.value} r={5} fill={info.color} stroke="white" strokeWidth={2} />}
          </LineChart>
        </ResponsiveContainer>
        {connected && data.current && <div key={rows[0]?.id} className="sensor-sweep pointer-events-none absolute inset-y-3 left-14 w-px" style={{ backgroundColor: info.color }} aria-hidden="true" />}
      </> : <div className="flex h-full flex-col items-center justify-center gap-2 text-center"><Activity size={28} className="text-slate-300" aria-hidden="true" /><p className="text-sm muted">Esperando lecturas de {info.label.toLowerCase()}</p><p className="text-xs muted">El trazado aparecerá cuando este sensor envíe datos.</p></div>}
    </div>
    <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
      {["Mínimo", "Promedio", "Máximo"].map((label, index) => <div key={label}><dt className="text-[11px] muted">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{formatNumber(stats[index], info.decimals)} <span className="text-[10px] font-normal muted">{data.unit}</span></dd></div>)}
    </dl>
    <p className="mt-3 text-[11px] leading-5 muted">{data.values.length} lecturas {data.original ? "originales sin calibrar" : "válidas"} en la ventana · Hora de recepción (Bolivia). Línea discontinua: sin calibrar. Las interrupciones quedan como huecos; no se mezclan unidades ni estados en las estadísticas.</p>
  </section>;
}
