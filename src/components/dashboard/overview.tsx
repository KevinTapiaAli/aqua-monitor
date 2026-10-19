
"use client";

import { LdrDigitalPanel } from "@/components/dashboard/ldr-digital-panel";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowUpRight, Bell, Droplet, Radio, RefreshCw, Thermometer, Sun, Wind } from "lucide-react";
import { useDevices } from "@/components/layout/device-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { useLiveMeasurements } from "@/hooks/use-live-measurements";
import { type Device, type Parameter } from "@/types/domain";
import { deviceStatus, statusLabels } from "@/lib/utils/device-status";
import { formatDate } from "@/lib/utils/format";
import { parameterInfo } from "@/config/parameters";
import { sensorSample } from "@/lib/utils/sensor-analysis";

const sensorTabs = [
  { parameter: "temperature_c", icon: Thermometer },
  { parameter: "soil_adc", icon: Droplet },
  { parameter: "gas_adc", icon: Wind },
  { parameter: "light_adc", icon: Sun },
] as const;

const LiveSensorChart = dynamic(() => import("@/components/charts/live-sensor-chart"), { ssr: false, loading: () => <div className="panel flex h-96 items-center justify-center text-sm muted">Cargando monitor…</div> });

export function Overview() {
  const { device } = useDevices();
  return <><div><h1 className="text-3xl font-bold tracking-tight">Análisis por sensor</h1><p className="mt-2 text-sm muted">De cada lectura a su evolución: explora los datos reales de tu estación.</p></div>
    {device ? <StationOverview key={device.id} initialDevice={device} /> : <EmptyState title="Tu primera estación comienza aquí"><p>Registra un dispositivo y prepara su conexión para recibir mediciones reales.</p><Link className="btn mt-5" href="/dashboard/devices">Registrar dispositivo <ArrowUpRight size={16} /></Link></EmptyState>}
  </>;
}
function StationOverview({ initialDevice }: { initialDevice: Device }) {
  const { userId } = useDevices();
  const live = useLiveMeasurements(initialDevice);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [parameter, setParameter] = useState<Parameter>("temperature_c");
  const status = deviceStatus(live.device, live.now);
  const latest = live.rows[0];
  const sensorAlerts = live.alerts.filter((alert) => alert.parameter === parameter);
  async function acknowledge(id: string) {
    setBusyId(id); setActionError("");
    try { await live.acknowledge(id); } catch (error) { setActionError(error instanceof Error ? error.message : "No se pudo reconocer la alerta."); } finally { setBusyId(""); }
  }
  return <>
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-100 bg-cyan-50/60 px-5 py-4">
      <div className="flex items-center gap-3"><Radio className="text-cyan-700" aria-hidden="true" /><div><h2 className="font-semibold">{live.device.name}</h2><p className="mt-1 text-xs muted">{live.device.location || "Ubicación sin especificar"}</p></div></div>
      <div className="flex flex-wrap gap-3"><span className={`badge ${status === "online" ? "badge-ok" : "badge-warn"}`}>{statusLabels[status]}</span><span className="badge">Realtime: {live.connection}</span></div>
    </section>
    {live.error && <div role="alert" className="message message-error flex flex-wrap items-center justify-between gap-3">{live.error}<button className="btn btn-secondary" onClick={live.retry}><RefreshCw size={15} /> Reintentar</button></div>}
    {live.loading && <p role="status" className="text-sm muted">Cargando mediciones…</p>}
    <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Seleccionar sensor para analizar">{sensorTabs.map(({ parameter: p, icon: Icon }) => {
      const hasData = live.rows.some((row) => sensorSample(row, p) !== null);
      return <button key={p} type="button" aria-pressed={parameter === p} onClick={() => setParameter(p)} className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors ${parameter === p ? "border-cyan-700 bg-[#123446] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-400"}`}><Icon size={20} aria-hidden="true" /><span><span className="block text-sm font-semibold">{parameterInfo[p].label}</span><span className={`mt-1 block text-[11px] ${parameter === p ? "text-slate-300" : "text-slate-500"}`}>{hasData ? "Ver análisis" : "Sin lecturas disponibles"}</span></span></button>;
    })}</nav>
    <div className="flex flex-wrap justify-between gap-2 text-xs muted"><p>Última recepción: {formatDate(latest?.received_at)}</p><p>Adquisición: {latest?.measured_at ? formatDate(latest.measured_at) : "Sin hora confirmada por el dispositivo"}</p></div>
    {latest?.measured_at && live.now - Date.parse(latest.measured_at) > Math.max(30, live.device.expected_interval_seconds * 3) * 1000 && <p className="message">La última muestra fue adquirida hace más tiempo que el intervalo esperado. Puede ser una lectura pendiente transmitida después de una desconexión.</p>}
    {status !== "online" && latest && <p className="message">Estos indicadores corresponden a la última lectura almacenada. El dispositivo no está transmitiendo recientemente.</p>}
    {!live.loading && !latest && <p className="message">Aún no hay lecturas. La estación aparecerá conectada cuando la API reciba datos válidos.</p>}
    {parameter === "light_adc" && (
  <LdrDigitalPanel rows={live.rows} />
)}
    <LiveSensorChart key={parameter} parameter={parameter} rows={live.rows} rules={live.rules} intervalSeconds={live.device.expected_interval_seconds} connected={status === "online" && live.connection === "En vivo"} />
    <section className="panel"><div className="mb-5 flex flex-wrap items-center gap-2"><Bell size={18} className="text-cyan-700" aria-hidden="true" /><h2 className="font-semibold">Alertas de {parameterInfo[parameter].label.toLowerCase()}</h2><span className="badge">{sensorAlerts.length}</span><button className="btn btn-secondary ml-auto" onClick={live.retry} disabled={live.loading}>Actualizar pendientes</button></div>
      {actionError && <p role="alert" className="message message-error mb-4">{actionError}</p>}
      {live.alerts.length === 50 && <p className="mb-3 text-xs muted">Se muestran las coincidencias entre las 50 alertas pendientes más recientes de la estación.</p>}
      {!sensorAlerts.length ? <p className="text-sm muted">No hay eventos de este sensor en la consulta actual. Los umbrales se aplican a lecturas válidas; su ausencia no certifica las condiciones ambientales.</p> : <ul className="divide-y divide-slate-100">{sensorAlerts.map((alert) => <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-semibold">{parameterInfo[alert.parameter].label} <span className="ml-2 badge badge-warn">{alert.kind === "threshold" ? "Umbral" : "Sensor"}</span></p><p className="mt-1 text-sm muted">{alert.message}</p><p className="mt-1 text-xs muted">{formatDate(alert.created_at)}</p></div>{live.device.owner_id === userId && <button className="btn btn-secondary" disabled={Boolean(busyId)} onClick={() => void acknowledge(alert.id)}>Reconocer</button>}</li>)}</ul>}
    </section>
  </>;
}
