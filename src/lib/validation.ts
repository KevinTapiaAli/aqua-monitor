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
  ph: finite.nullable(),
  temperature_c: finite.min(-273.15).nullable(),
  turbidity_value: finite.min(0).nullable(),
  turbidity_unit: z.enum(["NTU", "V", "ADC"]).nullable(),
  ec_us_cm: finite.min(0).nullable(),
  quality: z.strictObject({ ph: qualityStatus, temperature_c: qualityStatus, turbidity_value: qualityStatus, ec_us_cm: qualityStatus }),
  raw: z.partialRecord(z.enum(parameters), rawReading),
}).superRefine((data, ctx) => {
  if (data.measured_at && (Date.parse(data.measured_at) > Date.now() + 300_000 || Date.parse(data.measured_at) < Date.UTC(2020, 0, 1))) {
    ctx.addIssue({ code: "custom", path: ["measured_at"], message: "Reloj inválido: envía null si no está sincronizado." });
  }
  for (const key of parameters) {
    const state = data.quality[key];
    const value = data[key];
    if ((state === "ok" || state === "out_of_range") && value === null) {
      ctx.addIssue({ code: "custom", path: [key], message: "Este estado requiere un valor numérico." });
    }
    if ((state === "missing" || state === "sensor_error" || (state === "uncalibrated" && key !== "turbidity_value")) && value !== null) {
      ctx.addIssue({ code: "custom", path: [key], message: "Utiliza null y conserva la lectura original en raw." });
    }
  }
  if ((data.turbidity_value === null) !== (data.turbidity_unit === null)) {
    ctx.addIssue({ code: "custom", path: ["turbidity_unit"], message: "Valor y unidad deben estar presentes juntos." });
  }
  if (data.turbidity_value !== null) {
    const calibrated = ["ok", "out_of_range"].includes(data.quality.turbidity_value);
    if ((calibrated && data.turbidity_unit !== "NTU") || (!calibrated && data.turbidity_unit === "NTU")) {
      ctx.addIssue({ code: "custom", path: ["turbidity_unit"], message: "NTU requiere una conversión válida; usa V o ADC para datos sin calibrar." });
    }
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
  const units = { ph: ["pH"], temperature_c: ["°C"], turbidity_value: ["NTU", "V", "ADC"], ec_us_cm: ["µS/cm"] };
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
