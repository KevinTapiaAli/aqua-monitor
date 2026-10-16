import type { Alert, AlertRule, Calibration, Device, Json, Measurement, Profile } from "./domain";

// Contrato de la migración inicial. Regenerar con Supabase CLI tras cambiar el SQL.
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      devices: Table<Device>;
      device_users: Table<{ device_id: string; user_id: string; role: "owner" | "viewer"; created_at: string }>;
      measurements: Table<Measurement, never, never>;
      alert_rules: Table<AlertRule>;
      alerts: Table<Alert, never, never>;
      calibrations: Table<Calibration>;
    };
    Views: { [_ in never]: never };
    Functions: {
      register_device: { Args: { p_name: string; p_location: string; p_interval: number; p_token_hash: string; p_device_id: string }; Returns: string };
      rotate_device_credential: { Args: { p_device_id: string; p_token_hash: string | null }; Returns: undefined };
      ingest_measurement: { Args: { p_device_id: string; p_token_hash: string; p_payload: Json; p_payload_hash: string }; Returns: Json };
      acknowledge_alert: { Args: { p_alert_id: string }; Returns: undefined };
      can_access_device: { Args: { target: string }; Returns: boolean };
      owns_device: { Args: { target: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
