import type { Parameter, QualityStatus } from "@/types/domain";

export const parameterInfo: Record<Parameter, { label: string; unit: string; color: string; decimals: number }> = {
  ph: { label: "pH", unit: "pH", color: "#0891b2", decimals: 2 },
  temperature_c: { label: "Temperatura", unit: "°C", color: "#d97706", decimals: 2 },
  turbidity_value: { label: "Turbidez", unit: "NTU", color: "#7c3aed", decimals: 2 },
  ec_us_cm: { label: "Conductividad", unit: "µS/cm", color: "#059669", decimals: 1 },
};
export const qualityLabels: Record<QualityStatus, string> = {
  ok: "Lectura válida",
  uncalibrated: "Sin calibrar",
  out_of_range: "Fuera de rango",
  sensor_error: "Error de sensor",
  missing: "No disponible",
};
