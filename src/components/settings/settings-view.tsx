"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SensorLimitsEditor, readSensorLimits } from "./sensor-limits-editor";
import { Save, SlidersHorizontal } from "lucide-react";
import { useDevices } from "@/components/layout/device-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api/client";
import { displayParameters as parameters, parameterInfo } from "@/config/parameters";
import { type AlertRule, type Device, type Parameter } from "@/types/domain";

export function SettingsView({ displayName }: { displayName: string }) {
  const router = useRouter();
  const { device, userId } = useDevices();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    const data = new FormData(event.currentTarget);
    try { await api("profile", { method: "PUT", body: JSON.stringify({ display_name: data.get("display_name") }) }); setMessage("Perfil guardado."); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  return <><div><h1 className="text-3xl font-bold">Configuración</h1><p className="mt-2 text-sm muted">Tu perfil, los umbrales y la trazabilidad de los sensores.</p></div>
    <section className="panel"><h2 className="mb-4 font-semibold">Perfil de usuario</h2><form className="flex flex-wrap items-end gap-4" onSubmit={saveProfile}><label className="max-w-sm grow">Nombre para mostrar<input name="display_name" defaultValue={displayName} required maxLength={100} /></label><button disabled={busy} className="btn"><Save size={15} /> Guardar perfil</button></form><p className="mt-4 break-all text-xs muted">Identificador de usuario: {userId}</p>{message && <p role="status" className="message mt-4">{message}</p>}{error && <p role="alert" className="message message-error mt-4">{error}</p>}</section>
    <section className="panel flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Seguridad de tu cuenta</h2><p className="mt-2 text-sm muted">Recibe un enlace en tu correo para cambiar tu contraseña.</p></div><Link href="/forgot-password" className="btn btn-secondary">Cambiar contraseña</Link></section>
    {device ? <StationSettings key={device.id} device={device} canEdit={device.owner_id === userId} /> : <EmptyState title="Configuración de la estación">Registra un dispositivo para definir umbrales.</EmptyState>}
  </>;
}
function StationSettings({ device, canEdit }: { device: Device; canEdit: boolean }) {
  const { refresh } = useDevices();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setLoadFailed(false);
      try {
        const r = await api<AlertRule[]>(`alert-rules?device_id=${device.id}`, { signal: controller.signal });
        if (!controller.signal.aborted) { setRules(r); setError(""); }
      } catch (e) { if (!controller.signal.aborted) { setLoadFailed(true); setError(e instanceof Error ? e.message : "No se pudo cargar."); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [device.id, revision]);
  async function save(operation: () => Promise<void>, notice: string) {
    setBusy(true); setError(""); setMessage("");
    try { await operation(); setMessage(notice); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); } finally { setBusy(false); }
  }
  async function saveRule(parameter: Parameter, form: FormData) {
    await save(async () => {
      const nullableNumber = (name: string) => String(form.get(name) ?? "").trim() === "" ? null : Number(form.get(name));
      const result = await api<AlertRule>("alert-rules", { method: "PUT", body: JSON.stringify({ device_id: device.id, parameter, min_value: nullableNumber("min"), max_value: nullableNumber("max"), enabled: form.get("enabled") === "on" }) });
      setRules((previous) => [...previous.filter((r) => r.parameter !== parameter), result]);
    }, "Umbral guardado. Se aplicará a las próximas lecturas válidas.");
  }
  function saveLimits(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void save(async () => {
      const sensor_limits = readSensorLimits(form, device.sensor_limits);
      await api(`devices/${device.id}`, { method: "PATCH", body: JSON.stringify({ sensor_limits, name: form.get("name"), location: form.get("location"), expected_interval_seconds: Number(form.get("interval")) }) });
      await refresh();
    }, "Configuración de estación guardada.");
  }
  return <>
    {error && <div role="alert" className="message message-error">{error}{loadFailed && <button className="btn btn-secondary ml-3" onClick={() => setRevision((n) => n + 1)}>Reintentar</button>}</div>}{message && <p role="status" className="message">{message}</p>}
    {!canEdit && <p className="message">Tienes acceso de consulta. Solo el propietario puede cambiar la configuración.</p>}
    <section className="panel"><h2 className="mb-2 flex items-center gap-2 font-semibold"><SlidersHorizontal size={18} /> Umbrales de advertencia</h2><p className="mb-6 text-sm leading-6 muted">Define límites para tu contexto de estudio. No se asignan límites ambientales universales ni umbrales de seguridad. Solo se evalúan lecturas marcadas como válidas y con unidades compatibles.</p>
      {loading ? <p role="status">Cargando reglas…</p> : !loadFailed && <div className="space-y-5">{parameters.map((p) => <RuleForm key={`${p}-${rules.find((r) => r.parameter === p)?.id ?? "new"}`} parameter={p} rule={rules.find((r) => r.parameter === p)} disabled={!canEdit || busy} save={saveRule} />)}</div>}
    </section>
    <section className="panel"><h2 className="mb-5 font-semibold">Estación y especificaciones de los sensores</h2><form onSubmit={saveLimits} className="space-y-4"><fieldset disabled={!canEdit || busy} className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><label>Nombre<input name="name" defaultValue={device.name} required maxLength={80} /></label><label>Ubicación<input name="location" defaultValue={device.location} maxLength={160} /></label><label>Intervalo esperado (s)<input name="interval" type="number" min={5} max={3600} defaultValue={device.expected_interval_seconds} required /></label></div>
      <SensorLimitsEditor limits={device.sensor_limits} /><button className="btn">Guardar estación</button></fieldset></form>
    </section>

  </>;
}
function RuleForm({ parameter, rule, disabled, save }: { parameter: Parameter; rule?: AlertRule; disabled: boolean; save: (parameter: Parameter, form: FormData) => Promise<void> }) {
  return <form onSubmit={(event) => { event.preventDefault(); void save(parameter, new FormData(event.currentTarget)); }} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0"><fieldset disabled={disabled} className="flex flex-wrap items-end gap-4"><legend className="mb-3 text-sm font-semibold">{parameterInfo[parameter].label} ({parameterInfo[parameter].unit})</legend><label className="min-w-36 grow">Mínimo<input name="min" type="number" step="any" defaultValue={rule?.min_value ?? ""} placeholder="Sin mínimo" /></label><label className="min-w-36 grow">Máximo<input name="max" type="number" step="any" defaultValue={rule?.max_value ?? ""} placeholder="Sin máximo" /></label><label className="flex items-center gap-2 pb-3"><input name="enabled" type="checkbox" defaultChecked={rule?.enabled ?? true} /> Activa</label><button className="btn btn-secondary">Guardar umbral</button></fieldset></form>;
}
