"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, type CSSProperties } from "react";
import { Activity, ArrowUpRight, Bell, ChevronRight, CircleAlert, CircleCheck, RefreshCw, Sun, Thermometer, Wind } from "lucide-react";
import { useDevices } from "@/components/layout/device-provider";
import { useLiveMeasurements, LIVE_HISTORY_MS } from "@/hooks/use-live-measurements";
import { deviceStatus, statusLabels } from "@/lib/utils/device-status";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { parameterInfo, qualityLabels } from "@/config/parameters";
import { sensorSample } from "@/lib/utils/sensor-analysis";
import { sensorHealth } from "@/lib/utils/sensor-health";
import type { Device, QualityStatus } from "@/types/domain";
import { ReadableSensorPanel } from "./readable-sensor-panel";

const sensors = [
  { parameter: "temperature_c", label: "Temperatura", model: "DS18B20", icon: Thermometer, max: 50, bands: [30, 35] },
  { parameter: "light_adc", label: "Luz", model: "LDR", icon: Sun, max: 65535, bands: [22000, 44000] },
  { parameter: "gas_adc", label: "Respuesta a gases", model: "MQ-135", icon: Wind, max: 65535, bands: [40000, 50000] },
] as const;

const MeasurementChart = dynamic(() => import("@/components/charts/measurement-chart"), {
  ssr: false,
  loading: () => <p className="flex h-52 items-center justify-center text-sm text-slate-400">Cargando gráfica…</p>,
});
const LiveSensorChart = dynamic(() => import("@/components/charts/live-sensor-chart"), { ssr: false });

type Sensor = typeof sensors[number];

function Gauge({ sensor, value, quality }: { sensor: Sensor; value: number | undefined; quality: QualityStatus | undefined }) {
  const { max, bands, parameter } = sensor;
  const position = value === undefined ? null : Math.min(1, Math.max(0, value / max));
  const style = {
    "--band-one": (bands[0] / max * 180) + "deg",
    "--band-two": (bands[1] / max * 180) + "deg",
    "--needle-angle": ((position ?? 0) * 180 - 90) + "deg",
  } as CSSProperties;
  const unit = parameterInfo[parameter].unit;
  return <div className="monitor-card flex min-h-52 flex-col items-center justify-center px-4 pt-5 pb-4">
    <div className="monitor-gauge" style={style}>
      <div className="monitor-gauge-arc" aria-hidden="true" />
      {position !== null && <div className="monitor-gauge-needle" aria-hidden="true" />}
      <p className="monitor-gauge-value tabular-nums" aria-label={value === undefined ? "Lectura no disponible" : undefined}>
        {formatNumber(value, parameter === "temperature_c" ? 1 : 0)} <span>{unit}</span>
      </p>
    </div>
    <div className="mt-2 flex w-full max-w-56 justify-between text-xs text-slate-400" aria-label="Escala del indicador">
      <span>0</span><span>{formatNumber(max, 0)}</span>
    </div>
    <p className="mt-1 text-sm font-medium text-slate-300">{sensor.model}</p>
    {quality && <p className="mt-1 text-xs text-slate-400">{qualityLabels[quality]}</p>}
  </div>;
}

export function Overview() {
  const { device } = useDevices();
  return device ? <StationOverview key={device.id} initialDevice={device} /> :
    <section className="monitor-card px-5 py-9">
      <h1 className="text-2xl font-semibold">Ambiente</h1>
      <p className="mt-3 text-sm text-slate-300">Registra una estación o comparte tu identificador de perfil con un administrador para consultar sus datos.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="monitor-action" href="/dashboard/devices">Registrar estación <ArrowUpRight size={15} /></Link>
        <Link className="monitor-action" href="/dashboard/settings">Ver mi identificador</Link>
      </div>
    </section>;
}

function StationOverview({ initialDevice }: { initialDevice: Device }) {
  const { userId } = useDevices();
  const live = useLiveMeasurements(initialDevice);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [parameter, setParameter] = useState<Sensor["parameter"]>("temperature_c");
  const status = deviceStatus(live.device, live.now);
  const latest = live.rows[0];
  const connected = status === "online" && live.connection === "En vivo";
  const assessments = sensors.map((sensor) => ({
    ...sensor,
    value: latest ? sensorSample(latest, sensor.parameter)?.value : undefined,
    health: sensorHealth(live.rows.slice(0, 8), sensor.parameter, 65535, live.device.expected_interval_seconds),
  }));
  const received = assessments.filter(({ value }) => value !== undefined).length;
  const hasWarnings = assessments.some(({ health }) => health) || live.alerts.length > 0;
  const acquisitionDelayed = latest?.measured_at && live.now - Date.parse(latest.measured_at) > Math.max(30, live.device.expected_interval_seconds * 3) * 1000;
  const state = !latest ? (live.loading ? "Cargando mediciones" : "Sin lecturas disponibles") :
    status !== "online" ? "Último registro almacenado" :
    hasWarnings ? "Revisar lecturas" : "Recibiendo lecturas";
  const StateIcon = !latest ? Activity : status !== "online" || hasWarnings ? CircleAlert : CircleCheck;
  const timeWindow = {
    start: live.now - LIVE_HISTORY_MS,
    end: live.now,
    gapMs: Math.max(30, live.device.expected_interval_seconds * 3) * 1000,
  };

  async function acknowledge(id: string) {
    setBusyId(id);
    setActionError("");
    try { await live.acknowledge(id); }
    catch (error) { setActionError(error instanceof Error ? error.message : "No se pudo reconocer la alerta."); }
    finally { setBusyId(""); }
  }

  return <>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-semibold tracking-tight">Ambiente</h1><p className="mt-1 text-sm text-slate-400">{live.device.name}{live.device.location && " · " + live.device.location}</p></div>
      <span className="text-sm text-slate-300">{statusLabels[status]} · {live.connection}</span>
    </div>

    <section className="monitor-card space-y-3 p-4" aria-label="Estado de la estación">
      <div className={`monitor-status ${latest && status === "online" && !hasWarnings ? "monitor-status-ok" : ""}`}>
        <StateIcon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div><h2 className="font-semibold">{state}</h2><p className="mt-0.5 text-sm">{latest ? received + " de 3 sensores con lectura utilizable en la última recepción." : "Las gráficas se llenan a medida que llegan datos de la estación."}</p></div>
      </div>
      {live.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-950/70 p-3 text-sm text-rose-100">
        {live.error}<button className="monitor-action" onClick={live.retry}><RefreshCw size={15} /> Reintentar</button>
      </div>}
      {latest && <div className="flex flex-wrap justify-between gap-x-5 gap-y-1 text-xs text-slate-300">
        <p>Última recepción · {formatDate(latest.received_at)}</p>
        <p>Adquisición · {latest.measured_at ? formatDate(latest.measured_at) : "Hora sin confirmar"}{acquisitionDelayed && " · Atrasada"}</p>
      </div>}
      <p className="text-xs text-slate-400">Las bandas de color sirven como referencia visual. Luz y respuesta a gases se muestran en cuentas ADC.</p>
    </section>

    <div className="grid gap-5 md:grid-cols-3">
      {assessments.map((sensor) => {
        const { parameter: key, label, icon: Icon, value, health } = sensor;
        const unit = parameterInfo[key].unit;
        return <section key={key} className="min-w-0 space-y-3" aria-label={label}>
          <h2 className="flex items-center gap-2 text-base font-semibold"><Icon size={18} className="text-slate-300" aria-hidden="true" />{label}</h2>
          <Gauge sensor={sensor} value={value} quality={latest?.quality[key]} />
          <div className="monitor-card px-3 py-4 sm:px-4">
            <Link href={`/dashboard/history#historial-${key}`} aria-label={`Abrir el historial de ${label}`} className="flex items-center justify-between gap-2 rounded text-base font-semibold hover:text-sky-200">
              Historial · últimas 2 h <ChevronRight className="shrink-0" size={17} aria-hidden="true" />
            </Link>
            <p className="mt-2 pl-2 text-xs text-slate-300">{unit}</p>
            <MeasurementChart rows={live.rows} parameter={key} unit={unit} timeWindow={timeWindow} />
          </div>
          {health && <p className="text-xs text-amber-200">{health.title}</p>}
        </section>;
      })}
    </div>

    <details className="monitor-card p-4" onToggle={(event) => setAnalysisOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">Análisis por sensor</summary>
      {analysisOpen && <div className="monitor-analysis mt-4 space-y-4 rounded-xl bg-slate-100 p-3 text-slate-800 sm:p-4">
        <label className="max-w-56">Sensor<select value={parameter} onChange={(event) => setParameter(event.target.value as Sensor["parameter"])}>
          {sensors.map((sensor) => <option key={sensor.parameter} value={sensor.parameter}>{sensor.label}</option>)}
        </select></label>
        {parameter === "temperature_c" ? <LiveSensorChart parameter={parameter} rows={live.rows} intervalSeconds={live.device.expected_interval_seconds} connected={connected} /> :
          <ReadableSensorPanel key={parameter} parameter={parameter} rows={live.rows} intervalSeconds={live.device.expected_interval_seconds} connected={connected} />}
        {parameter !== "temperature_c" && <details className="panel"><summary className="cursor-pointer font-semibold">Ver análisis original en ADC</summary>
          <LiveSensorChart key={parameter} parameter={parameter} rows={live.rows} intervalSeconds={live.device.expected_interval_seconds} connected={connected} />
        </details>}
      </div>}
    </details>

    <details className="monitor-card p-4">
      <summary className="cursor-pointer font-semibold">Alertas pendientes ({live.alerts.length})</summary>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Bell size={19} className="text-slate-300" aria-hidden="true" />
        <button className="monitor-action" onClick={live.retry} disabled={live.loading}>Actualizar alertas</button>
      </div>
      {actionError && <p role="alert" className="my-3 text-sm text-rose-200">{actionError}</p>}
      {!live.alerts.length ? <p className="mt-3 text-sm text-slate-300">No hay alertas pendientes en la consulta actual.</p> : <ul className="divide-y divide-slate-700">
        {live.alerts.map((alert) => <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-medium">{parameterInfo[alert.parameter].label} · {alert.kind === "threshold" ? "Umbral" : "Sensor"}</p>
            <p className="mt-1 text-sm text-slate-300">{alert.message}</p><p className="mt-1 text-xs text-slate-400">{formatDate(alert.created_at)}</p></div>
          {live.device.owner_id === userId && <button className="monitor-action" disabled={Boolean(busyId)} onClick={() => void acknowledge(alert.id)}>Reconocer</button>}
        </li>)}
      </ul>}
    </details>
  </>;
}
