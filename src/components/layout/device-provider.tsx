"use client";
import { createContext, useContext, useState } from "react";
import type { Device } from "@/types/domain";
import { api } from "@/lib/api/client";

type Context = { devices: Device[]; device: Device | undefined; selectedId: string; select: (id: string) => void; refresh: () => Promise<void>; userId: string };
const DeviceContext = createContext<Context | null>(null);
export function DeviceProvider({ initialDevices, userId, children }: { initialDevices: Device[]; userId: string; children: React.ReactNode }) {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedId, select] = useState(initialDevices[0]?.id ?? "");
  async function refresh() {
    const data = await api<Device[]>("devices");
    setDevices(data);
    // Si se revocó el acceso a la estación seleccionada, se vuelve a una estación disponible.
    select((current) => data.some((d) => d.id === current) ? current : data[0]?.id ?? "");
  }
  // La selección determina qué controles muestra la interfaz. El servidor verifica los permisos sobre cada estación.
  return <DeviceContext.Provider value={{ devices, device: devices.find((d) => d.id === selectedId), selectedId, select, refresh, userId }}>{children}</DeviceContext.Provider>;
}
export function useDevices() {
  const value = useContext(DeviceContext);
  if (!value) throw new Error("Falta DeviceProvider.");
  return value;
}
