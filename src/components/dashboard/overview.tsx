"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Bell, Radio, RefreshCw } from "lucide-react";
import { useDevices } from "@/components/layout/device-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "./metric-card";
import { ChartPanel } from "@/components/charts/chart-panel";
import { useLiveMeasurements } from "@/hooks/use-live-measurements";
import { parameters, type Device } from "@/types/domain";
import { deviceStatus, statusLabels } from "@/lib/utils/device-status";
import { formatDate } from "@/lib/utils/format";
import { parameterInfo } from "@/config/parameters";

export function Overview() {
  const { device } = useDevices();
  return <><div><h1 className="text-3xl font-bold tracking-tight">Una mirada al agua</h1><p className="mt-2 text-sm muted">Las últimas mediciones de tu estación, en un solo lugar.</p></div>
    {device ? <StationOverview key={device.id} initialDevice={device} /> : <EmptyState title="Tu primera estación comienza aquí"><p>Registra un dispositivo y prepara su conexión para recibir mediciones reales.</p><Link className="btn mt-5" href="/dashboard/devices">Registrar dispositivo <ArrowUpRight size={16} /></Link></EmptyState>}
  </>;
}
function StationOverview({ initialDevice }: { initialDevice: Device }) {
  const { userId } = useDevices();
  const live = useLiveMeasurements(initialDevice);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const status = deviceStatus(live.device, live.now);
  const latest = live.rows[0];
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{parameters.map((p) => <MetricCard key={p} parameter={p} reading={latest} rules={live.rules} />)}</div>
    <div className="flex flex-wrap justify-between gap-2 text-xs muted"><p>Última recepción: {formatDate(latest?.received_at)}</p><p>Adquisición: {latest?.measured_at ? formatDate(latest.measured_at) : "Sin hora confirmada por el dispositivo"}</p></div>
    {latest?.measured_at && live.now - Date.parse(latest.measured_at) > Math.max(30, live.device.expected_interval_seconds * 3) * 1000 && <p className="message">La última muestra fue adquirida hace más tiempo que el intervalo esperado. Puede ser una lectura pendiente transmitida después de una desconexión.</p>}
    {status !== "online" && latest && <p className="message">Estos indicadores corresponden a la última lectura almacenada. El dispositivo no está transmitiendo recientemente.</p>}
    {!live.loading && !latest && <p className="message">Aún no hay lecturas. La estación aparecerá conectada cuando la API reciba datos válidos.</p>}
    <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Evolución de los parámetros</h2><p className="mt-1 text-xs muted">Ventana de las últimas 120 recepciones</p></div><Link href="/dashboard/history" className="flex items-center gap-1 text-xs font-semibold text-cyan-800">Ver historial <ArrowUpRight size={14} /></Link></div>
    <div className="grid gap-5 xl:grid-cols-2">{parameters.map((p) => <ChartPanel key={p} parameter={p} rows={live.rows} />)}</div>
    <section className="panel"><div className="mb-5 flex flex-wrap items-center gap-2"><Bell size={18} className="text-cyan-700" aria-hidden="true" /><h2 className="font-semibold">Alertas pendientes</h2><span className="badge">{live.alerts.length}{live.alerts.length === 50 ? "+" : ""}</span><button className="btn btn-secondary ml-auto" onClick={live.retry} disabled={live.loading}>Actualizar pendientes</button></div>
      {actionError && <p role="alert" className="message message-error mb-4">{actionError}</p>}
      {!live.alerts.length ? <p className="text-sm muted">No hay eventos pendientes en la consulta actual. Configura umbrales para recibir advertencias; su ausencia no certifica la calidad del agua.</p> : <ul className="divide-y divide-slate-100">{live.alerts.map((alert) => <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-semibold">{parameterInfo[alert.parameter].label} <span className="ml-2 badge badge-warn">{alert.kind === "threshold" ? "Umbral" : "Sensor"}</span></p><p className="mt-1 text-sm muted">{alert.message}</p><p className="mt-1 text-xs muted">{formatDate(alert.created_at)}</p></div>{live.device.owner_id === userId && <button className="btn btn-secondary" disabled={Boolean(busyId)} onClick={() => void acknowledge(alert.id)}>Reconocer</button>}</li>)}</ul>}
    </section>
  </>;
}
