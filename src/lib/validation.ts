import { z } from "zod";
import { parameters } from "@/types/domain";

export const uuidSchema = z.uuid();
const finite = z.number().finite();
const timestamp = z.iso.datetime({ offset: true });
const qualityStatus = z.enum(["ok", "uncalibrated", "out_of_range", "sensor_error", "missing"]);
const rawReading = z.strictObject({ value: finite.nullable(), unit: z.string().trim().min(1).max(24), note: z.string().max(160).optional() });

export const ingestSchema = z.strictObject({
  reading_id: uuidSchema,
  measured_at: timestamp.nullable(),
  soil_adc: finite.int().min(0).max(65535).nullable(),
  temperature_c: finite.min(-273.15).nullable(),
  gas_adc: finite.int().min(0).max(65535).nullable(),
  light_adc: finite.int().min(0).max(65535).nullable(),
  quality: z.strictObject({ soil_adc: qualityStatus, temperature_c: qualityStatus, gas_adc: qualityStatus, light_adc: qualityStatus }),
  raw: z.record(z.string(), rawReading),
}).superRefine((data, ctx) => {
  
  // Permitir los sensores originales y el LDR digital.
  const allowedRaw = new Set<string>([
    ...parameters,
    "light_digital",
  ]);

  for (const key of Object.keys(data.raw)) {
    if (!allowedRaw.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["raw", key],
        message: "Parametro original no permitido.",
      });
    }
  }

  // LDR digital: solamente 0, 1 o null.
  const digital = data.raw["light_digital"];

  if (digital) {
    if (
      digital.unit !== "state" ||
      (digital.value !== null &&
        digital.value !== 0 &&
        digital.value !== 1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["raw", "light_digital"],
        message:
          "El LDR digital requiere estado 0, 1 o null y unidad state.",
      });
    }
  }

  if (data.measured_at && (Date.parse(data.measured_at) > Date.now() + 300_000 || Date.parse(data.measured_at) < Date.UTC(2020, 0, 1))) {
    ctx.addIssue({ code: "custom", path: ["measured_at"], message: "Reloj inválido: envía null si no está sincronizado." });
  }
  for (const key of parameters) {
    const state = data.quality[key];
    const value = data[key];
    if ((state === "ok" || state === "out_of_range") && value === null) {
      ctx.addIssue({ code: "custom", path: [key], message: "Este estado requiere un valor numérico." });
    }
    if ((state === "missing" || state === "sensor_error" || state === "uncalibrated") && value !== null) {
      ctx.addIssue({ code: "custom", path: [key], message: "Utiliza null y conserva la lectura original en raw." });
    }
  }
  for (const key of parameters) {
    const raw = data.raw[key];
    const unit = { temperature_c: "°C", soil_adc: "ADC", gas_adc: "ADC", light_adc: "ADC" }[key];
    if (raw && raw.unit !== unit) ctx.addIssue({ code: "custom", path: ["raw", key, "unit"], message: "Unidad original incompatible." });
    if (raw?.value != null && ((key === "temperature_c" && raw.value < -273.15) || (key !== "temperature_c" && (!Number.isInteger(raw.value) || raw.value < 0 || raw.value > 65535)))) {
      ctx.addIssue({ code: "custom", path: ["raw", key, "value"], message: "Lectura original fuera del dominio permitido." });
    }
    if (data.quality[key] === "uncalibrated" && raw?.value == null) ctx.addIssue({ code: "custom", path: ["raw", key], message: "Conserva el valor original sin calibrar." });
  }
});

export const deviceSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  location: z.string().trim().max(160).default(""),
  expected_interval_seconds: z.number().int().min(5).max(3600).default(10),
});
const limitSchema = z.strictObject({ min: finite, max: finite, unit: z.string().max(16), reference: z.string().trim().min(3).max(300) })
  .refine((v) => v.min < v.max, "El mínimo debe ser menor que el máximo.");
export const sensorLimitsSchema = z.partialRecord(z.enum(parameters), limitSchema).superRefine((limits, ctx) => {
  const units = { soil_adc: ["ADC"], temperature_c: ["°C"], gas_adc: ["ADC"], light_adc: ["ADC"] };
  for (const key of parameters) {
    if (limits[key] && !units[key].includes(limits[key].unit)) ctx.addIssue({ code: "custom", path: [key, "unit"], message: "Unidad incompatible." });
  }
});
export const deviceUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(80).optional(),
  location: z.string().trim().max(160).optional(),
  expected_interval_seconds: z.number().int().min(5).max(3600).optional(),
  is_active: z.boolean().optional(), sensor_limits: sensorLimitsSchema.optional(),
}).refine((v) => Object.keys(v).length > 0, "No hay cambios.");
export const ruleSchema = z.strictObject({
  device_id: uuidSchema, parameter: z.enum(parameters),
  min_value: finite.nullable(), max_value: finite.nullable(), enabled: z.boolean(),
}).refine((v) => v.min_value !== null || v.max_value !== null, "Configura al menos un límite.")
  .refine((v) => v.min_value === null || v.max_value === null || v.min_value < v.max_value, "El mínimo debe ser menor que el máximo.");
export const calibrationSchema = z.strictObject({
  device_id: uuidSchema, parameter: z.enum(parameters),
  method: z.string().trim().min(3).max(500), reference: z.string().trim().min(3).max(500),
  coefficients: z.record(z.string().max(40), finite).refine((v) => JSON.stringify(v).length <= 4096, "Demasiados coeficientes."),
  performed_at: timestamp.refine((v) => Date.parse(v) <= Date.now(), "La fecha no puede ser futura."),
});
export const measurementQuerySchema = z.object({
  device_id: uuidSchema,
  from: timestamp.optional(), to: timestamp.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(120),
  cursor: z.string().max(300).optional(),
}).superRefine((v, ctx) => {
  if (v.from && v.to && (Date.parse(v.from) >= Date.parse(v.to) || Date.parse(v.to) - Date.parse(v.from) > 31 * 86400_000)) {
    ctx.addIssue({ code: "custom", path: ["to"], message: "El periodo debe ser positivo y no superar 31 días." });
  }
  if (Boolean(v.from) !== Boolean(v.to)) ctx.addIssue({ code: "custom", path: ["from"], message: "Indica ambas fechas." });
});
export const profileSchema = z.strictObject({ display_name: z.string().trim().min(1).max(100) });
