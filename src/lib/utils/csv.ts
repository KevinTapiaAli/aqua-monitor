import type { Measurement } from "@/types/domain";
import { parameters } from "@/types/domain";

function cell(value: unknown): string {
  let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  // Neutraliza fórmulas de hojas de cálculo; los números negativos siguen siendo números.
  if (typeof value === "string" && /^\s*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function measurementsCsv(rows: Measurement[]) {
  const headers = ["id", "device_id", "reading_id", "measured_at_utc", "received_at_utc", "ph", "temperature_c", "turbidity_value", "turbidity_unit", "ec_us_cm", ...parameters.map((p) => `quality_${p}`), "raw_json"];
  const lines = rows.map((m) => [m.id, m.device_id, m.reading_id, m.measured_at, m.received_at, m.ph, m.temperature_c, m.turbidity_value, m.turbidity_unit, m.ec_us_cm, ...parameters.map((p) => m.quality[p]), m.raw].map(cell).join(","));
  return "\uFEFF" + [headers.map(cell).join(","), ...lines].join("\r\n");
}
