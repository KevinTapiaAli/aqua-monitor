export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export const parameters = ["temperature_c", "soil_adc", "gas_adc", "light_adc"] as const;
export type Parameter = typeof parameters[number];
export type QualityStatus = "ok" | "uncalibrated" | "out_of_range" | "sensor_error" | "missing";
export type Quality = Record<Parameter, QualityStatus>;
export type SensorLimits = Partial<Record<Parameter, { min: number; max: number; unit: string; reference: string }>>;

export type Device = {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  is_active: boolean;
  expected_interval_seconds: number;
  last_received_at: string | null;
  sensor_limits: SensorLimits;
  created_at: string;
};
export type Measurement = {
  id: string;
  device_id: string;
  reading_id: string;
  soil_adc: number | null;
  temperature_c: number | null;
  gas_adc: number | null;
  light_adc: number | null;
  measured_at: string | null;
  received_at: string;
  created_at: string;
  quality: Quality;
  raw: Json;
  payload_hash: string;
};
export type AlertRule = {
  id: string;
  device_id: string;
  parameter: Parameter;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  enabled: boolean;
  created_at: string;
};
export type Alert = {
  id: string;
  device_id: string;
  measurement_id: string;
  rule_id: string | null;
  parameter: Parameter;
  kind: "threshold" | "sensor_error" | "out_of_range";
  message: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
};
export type Calibration = {
  id: string;
  device_id: string;
  parameter: Parameter;
  method: string;
  reference: string;
  coefficients: Json;
  performed_at: string;
  created_by: string;
  created_at: string;
};
export type Profile = { id: string; display_name: string; created_at: string };
export type PageResult<T> = { items: T[]; next_cursor: string | null; limit: number };
