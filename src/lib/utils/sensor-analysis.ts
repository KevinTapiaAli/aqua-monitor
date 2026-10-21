import { displayParameters, parameterInfo } from "@/config/parameters";
import type { Measurement, Parameter } from "@/types/domain";

export type SensorSample = { value: number; unit: string; original: boolean };

export function visibleOriginals(row: Measurement) {
  const result: Record<string, { value: unknown; unit: unknown }> = {};
  if (!row.raw || typeof row.raw !== "object" || Array.isArray(row.raw)) return result;
  for (const parameter of displayParameters) {
    const entry = row.raw[parameter];
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      result[parameter] = { value: entry.value ?? null, unit: entry.unit ?? parameterInfo[parameter].unit };
    }
  }
  return result;
}

export function sensorSample(row: Measurement, parameter: Parameter): SensorSample | null {
  const quality = row.quality[parameter];
  if (quality !== "ok" && quality !== "uncalibrated") return null;
  let value: unknown = row[parameter];
  let unit: unknown = parameterInfo[parameter].unit;
  if (quality === "uncalibrated" && value == null) {
    const raw = row.raw;
    const entry = raw && typeof raw === "object" && !Array.isArray(raw) ? raw[parameter] : null;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    value = entry.value;
    unit = entry.unit;
  }
  const units = [parameterInfo[parameter].unit];
  if (typeof value !== "number" || !Number.isFinite(value) || typeof unit !== "string" || !units.includes(unit)) return null;
  return { value, unit, original: quality === "uncalibrated" };
}

export function analyzeSensor(rows: Measurement[], parameter: Parameter, count: number, mode: "auto" | "original" | "valid", interval: number) {
  const ordered = [...rows].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at) || b.id.localeCompare(a.id)).slice(0, count).reverse();
  const entries = ordered.map((row) => ({ row, time: Date.parse(row.received_at), sample: sensorSample(row, parameter) }));
  const lastSample = entries.findLast((entry) => entry.sample)?.sample;
  const original = mode === "original" || (mode === "auto" && Boolean(lastSample?.original));
  const unit = entries.findLast((entry) => entry.sample?.original === original)?.sample?.unit ?? parameterInfo[parameter].unit;
  const points: { time: number; value: number | null; delta: number | null }[] = [];
  const values: number[] = [];
  let previous: { time: number; value: number | null } | undefined;
  for (const entry of entries) {
    const value = entry.sample?.original === original && entry.sample.unit === unit ? entry.sample.value : null;
    const gap = previous !== undefined && entry.time - previous.time > Math.max(30, interval * 3) * 1000;
    if (gap && previous) points.push({ time: previous.time + 1, value: null, delta: null });
    const delta = !gap && previous?.value != null && value !== null ? value - previous.value : null;
    points.push({ time: entry.time, value, delta });
    if (value !== null) values.push(value);
    previous = { time: entry.time, value };
  }
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const deviation = mean !== null ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) : null;
  const histogram: { from: number; to: number; count: number }[] = [];
  if (min !== null && max !== null) {
    const bins = min === max ? 1 : 6;
    const width = (max - min) / bins;
    for (let i = 0; i < bins; i++) histogram.push({ from: min + i * width, to: i === bins - 1 ? max : min + (i + 1) * width, count: 0 });
    for (const value of values) histogram[width === 0 ? 0 : Math.min(bins - 1, Math.floor((value - min) / width))].count++;
  }
  return { entries, points, values, current: points.at(-1)?.value ?? null, unit, original, min, max, mean, deviation, histogram, range: min !== null && max !== null ? max - min : null };
}
