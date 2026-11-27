"use client";

import Link from "next/link";
import { DeviceManager } from "@/components/devices/device-manager";
import { useDevices } from "@/components/layout/device-provider";
import { EmptyState } from "@/components/ui/empty-state";

export default function DevicesPage() {
  const { stationRole } = useDevices();
  if (stationRole === "observer") return <EmptyState title="Acceso de observador">
    <p>Consulta las mediciones y alertas de esta estación desde Ambiente.</p>
    <Link className="btn mt-4" href="/dashboard">Ver lecturas</Link>
  </EmptyState>;
  return <DeviceManager />;
}
