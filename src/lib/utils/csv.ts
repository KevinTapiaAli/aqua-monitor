import type { Measurement } from "@/types/domain";
import { displayParameters as parameters } from "@/config/parameters";
import { visibleOriginals } from "./sensor-analysis";

function cell(value: unknown): string {
  let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  // Neutraliza fórmulas de hojas de cálculo; los números negativos siguen siendo números.
  if (typeof value === "string" && /^\s*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function measurementsCsv(rows: Measurement[]) {
  const headers = ["id", "device_id", "reading_id", "measured_at_utc", "received_at_utc", "temperature_c", "gas_adc", "light_adc", ...parameters.map((p) => `quality_${p}`), "raw_json"];
  const lines = rows.map((m) => [m.id, m.device_id, m.reading_id, m.measured_at, m.received_at, m.temperature_c, m.gas_adc, m.light_adc, ...parameters.map((p) => m.quality[p]), visibleOriginals(m)].map(cell).join(","));
  return "\uFEFF" + [headers.map(cell).join(","), ...lines].join("\r\n");
}
