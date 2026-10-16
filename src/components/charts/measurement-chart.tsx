"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parameterInfo } from "@/config/parameters";
import type { Measurement, Parameter } from "@/types/domain";

export default function MeasurementChart({ rows, parameter, unit }: { rows: Measurement[]; parameter: Parameter; unit: string }) {
  const info = parameterInfo[parameter];
  const points = [...rows].reverse().map((row) => ({
    time: Date.parse(row.received_at),
    value: (row.quality[parameter] === "ok" || (parameter === "turbidity_value" && row.quality[parameter] === "uncalibrated")) && (parameter !== "turbidity_value" || row.turbidity_unit === unit) ? row[parameter] : null,
  }));
  const timeLabel = (value: number) => new Date(value).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" });
  return <div className="h-56 w-full" role="img" aria-label={`Evolución de ${info.label} en ${unit}. Los datos también están en la tabla de historial.`}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
      <CartesianGrid stroke="#e8eef3" strokeDasharray="3 5" vertical={false} />
      <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={timeLabel} minTickGap={50} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
      <YAxis width={48} domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
      <Tooltip labelFormatter={(label) => timeLabel(Number(label))} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
      <Line type="linear" dataKey="value" name={`${info.label} (${unit})`} stroke={info.color} strokeWidth={2} dot={points.length < 3} connectNulls={false} isAnimationActive={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}
