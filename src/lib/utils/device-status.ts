import type { Device } from "@/types/domain";

export function deviceStatus(device: Device, now = Date.now()): "disabled" | "waiting" | "online" | "offline" {
  if (!device.is_active) return "disabled";
  if (!device.last_received_at) return "waiting";
  const elapsed = now - Date.parse(device.last_received_at);
  return elapsed >= -5000 && elapsed <= Math.max(30, device.expected_interval_seconds * 3) * 1000 ? "online" : "offline";
}
export const statusLabels = { disabled: "Deshabilitado", waiting: "Sin transmisiones", online: "Conectado", offline: "Desconectado" };
