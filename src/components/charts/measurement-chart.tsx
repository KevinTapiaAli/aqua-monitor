"use client";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { sensorSample } from "@/lib/utils/sensor-analysis";
import { parameterInfo } from "@/config/parameters";
import type { Measurement, Parameter } from "@/types/domain";

const timeFormatter = new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" });

export default function MeasurementChart({ rows, parameter, unit, timeWindow }: {
  rows: Measurement[];
  parameter: Parameter;
  unit: string;
  timeWindow?: { start: number; end: number; gapMs: number };
}) {
  const info = parameterInfo[parameter];
  const start = timeWindow?.start ?? -Infinity;
  const end = timeWindow?.end ?? Infinity;
  const gapMs = timeWindow?.gapMs ?? Infinity;
  const points = useMemo(() => {
    const readings = rows.map((row) => ({ row, time: Date.parse(row.received_at) }))
      .filter(({ time }) => time >= start && time <= end).sort((a, b) => a.time - b.time);
    const result: { time: number; value: number | null }[] = [];
    let previous: number | undefined;
    for (const { row, time } of readings) {
      // Un punto nulo interrumpe la línea entre recepciones separadas por una pausa.
      if (previous !== undefined && time - previous > gapMs) result.push({ time: previous + 1, value: null });
      result.push({ time, value: sensorSample(row, parameter)?.value ?? null });
      previous = time;
    }
    return result;
  }, [rows, parameter, start, end, gapMs]);
  // La ventana fija muestra también los periodos sin recepciones. El historial completo ajusta el eje temporal a sus datos.
  const dark = Boolean(timeWindow);
  const ink = dark ? "#aab6c5" : "#64748b";
  const timeLabel = (value: number) => timeFormatter.format(value);
  const hasData = points.some((point) => point.value !== null);
  if (dark && !hasData) return <div className="flex h-52 items-center justify-center px-4 text-center text-sm text-slate-400">Sin lecturas disponibles en las últimas 2 h.</div>;

  return <div className={dark ? "h-52 w-full" : "h-56 w-full"} aria-label={`Evolución de ${info.label} en ${unit}. Los datos también están en la tabla de historial.`}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
      <CartesianGrid stroke={dark ? "#35404c" : "#e8eef3"} strokeDasharray={dark ? undefined : "3 5"} vertical={dark} />
      <XAxis dataKey="time" type="number" domain={timeWindow ? [timeWindow.start, timeWindow.end] : ["dataMin", "dataMax"]} allowDataOverflow={dark}
        ticks={timeWindow ? [1, 2, 3].map((step) => timeWindow.start + (timeWindow.end - timeWindow.start) * step / 4) : undefined}
        tickFormatter={timeLabel} minTickGap={36} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: ink }} />
      <YAxis width={46} domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: ink }} />
      <Tooltip labelFormatter={(label) => timeLabel(Number(label))} contentStyle={{ borderRadius: 8, fontSize: 12,
        ...(dark ? { background: "#172131", borderColor: "#435368", color: "#eff4fa" } : {}) }} />
      <Line type="linear" dataKey="value" name={`${info.label} (${unit})`} stroke={dark ? "#75aaff" : info.color} strokeWidth={dark ? 1.5 : 2}
        dot={!dark || points.length <= 40 ? { r: 2, strokeWidth: 0 } : false} connectNulls={false} isAnimationActive={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}
