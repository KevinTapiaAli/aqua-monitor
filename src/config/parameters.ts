import type { Parameter, QualityStatus } from "@/types/domain";

export const parameterInfo: Record<Parameter, { label: string; unit: string; color: string; decimals: number }> = {
  soil_adc: { label: "Humedad del suelo", unit: "ADC", color: "#0891b2", decimals: 0 },
  temperature_c: { label: "Temperatura", unit: "°C", color: "#d97706", decimals: 2 },
  gas_adc: { label: "Gas · MQ-135", unit: "ADC", color: "#7c3aed", decimals: 0 },
  light_adc: { label: "Luz · LDR", unit: "ADC", color: "#059669", decimals: 0 },
};
export const parameterNotes: Record<Parameter, string> = {
  temperature_c: "Temperatura en grados Celsius. Se conserva la lectura original cuando falta confirmar calibración.",
  soil_adc: "Respuesta analógica de humedad del suelo, módulo tipo YL-69 (0–65535). No representa un porcentaje sin caracterizar y calibrar la sonda en ese suelo.",
  gas_adc: "Respuesta analógica del MQ-135 (0–65535). No es una medición de CO₂ en ppm ni un detector de seguridad.",
  light_adc: "Respuesta analógica del LDR (0–65535). No equivale a lux; el sentido de la variación depende del circuito.",
};
export const qualityLabels: Record<QualityStatus, string> = {
  ok: "Lectura válida",
  uncalibrated: "Sin calibrar",
  out_of_range: "Fuera de rango",
  sensor_error: "Error de sensor",
  missing: "No disponible",
};
