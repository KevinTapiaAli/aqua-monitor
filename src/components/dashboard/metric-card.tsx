import { Droplet, Sun, Thermometer, Wind } from "lucide-react";
import type { AlertRule, Json, Measurement, Parameter } from "@/types/domain";
import { parameterInfo, qualityLabels } from "@/config/parameters";
import { formatNumber } from "@/lib/utils/format";

const icons = { soil_adc: Droplet, temperature_c: Thermometer, gas_adc: Wind, light_adc: Sun };
function originalReading(raw: Json | undefined, parameter: Parameter) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entry = raw[parameter];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  if (typeof entry.value !== "number" || !Number.isFinite(entry.value) || typeof entry.unit !== "string") return null;
  return { value: entry.value, unit: entry.unit };
}
export function MetricCard({ parameter, reading, rules }: { parameter: Parameter; reading?: Measurement; rules: AlertRule[] }) {
  const info = parameterInfo[parameter];
  const Icon = icons[parameter];
  const value = reading?.[parameter];
  const quality = reading?.quality[parameter] ?? "missing";
  const original = quality === "uncalibrated" && value == null ? originalReading(reading?.raw, parameter) : null;
  const unit = info.unit;
  const rule = rules.find((r) => r.parameter === parameter && r.enabled && r.unit === unit);
  const warning = quality === "ok" && value != null && rule && ((rule.min_value !== null && value < rule.min_value) || (rule.max_value !== null && value > rule.max_value));
  const state = warning ? "Advertencia por umbral" : qualityLabels[quality];
  return <section className="panel"><div className="flex items-center justify-between"><p className="text-sm font-medium muted">{info.label}</p><span className="rounded-lg bg-slate-50 p-2"><Icon size={19} style={{ color: info.color }} aria-hidden="true" /></span></div>
    <div className="my-5 flex items-baseline gap-2"><strong className="text-4xl font-semibold tracking-tight">{formatNumber(value, info.decimals)}</strong><span className="text-xs muted">{unit}</span></div>
    <span className={`badge ${warning || quality === "uncalibrated" ? "badge-warn" : quality === "ok" ? "badge-ok" : quality === "sensor_error" || quality === "out_of_range" ? "badge-error" : ""}`}><span className="size-1.5 rounded-full bg-current" />{state}</span>
    {original && <p className="mt-3 text-xs leading-5 muted">Lectura original: <span className="font-semibold">{formatNumber(original.value, info.decimals)} {original.unit}</span></p>}
  </section>;
}
