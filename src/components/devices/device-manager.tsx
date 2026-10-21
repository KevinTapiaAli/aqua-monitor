"use client";
import { useEffect, useState } from "react";
import { Copy, Cpu, KeyRound, Plus, RefreshCw } from "lucide-react";
import { useDevices } from "@/components/layout/device-provider";
import { api } from "@/lib/api/client";
import type { Device } from "@/types/domain";
import { formatDate } from "@/lib/utils/format";
import { deviceStatus, statusLabels } from "@/lib/utils/device-status";

export function DeviceManager() {
  const { devices, userId, refresh, select } = useDevices();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 10_000); return () => window.clearInterval(timer); }, []);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true); setError(""); setNotice(""); setToken("");
    try {
      const result = await api<{ id: string; token: string }>("devices", { method: "POST", body: JSON.stringify({ name: form.get("name"), location: form.get("location"), expected_interval_seconds: Number(form.get("interval")) }) });
      setToken(result.token); formElement.reset(); await refresh(); select(result.id); setNotice("Dispositivo registrado. Guarda su credencial antes de salir.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar."); }
    finally { setBusy(false); }
  }
  async function change(device: Device, operation: "toggle" | "rotate" | "revoke") {
    if (operation !== "toggle" && !window.confirm(operation === "rotate" ? "Se invalidará el token anterior. Tendrás que actualizar el ESP32. ¿Continuar?" : "El ESP32 dejará de poder enviar datos hasta generar una credencial nueva. ¿Revocar?")) return;
    setBusy(true); setError(""); setNotice(""); setToken("");
    try {
      if (operation === "toggle") await api(`devices/${device.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !device.is_active }) });
      if (operation === "rotate") { const result = await api<{ token: string }>(`devices/${device.id}/credentials`, { method: "POST" }); setToken(result.token); }
      if (operation === "revoke") await api(`devices/${device.id}/credentials`, { method: "DELETE" });
      await refresh(); setNotice(operation === "revoke" ? "Credencial revocada." : "Dispositivo actualizado.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar."); }
    finally { setBusy(false); }
  }
  async function reload() { setBusy(true); setError(""); try { await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar."); } finally { setBusy(false); } }
  return <>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Tus dispositivos</h1><p className="mt-2 text-sm muted">Identifica estaciones y administra su acceso a la plataforma.</p></div><button className="btn btn-secondary" disabled={busy} onClick={() => void reload()}><RefreshCw size={16} /> Actualizar estado</button></div>
    {error && <p role="alert" className="message message-error">{error}</p>}{notice && <p role="status" className="message">{notice}</p>}
    {token && <section className="panel border-amber-200 bg-amber-50"><div className="flex items-center gap-2 font-semibold"><KeyRound size={18} /> Credencial visible una sola vez</div><p className="my-3 text-sm">Guárdala en la configuración privada del ESP32. Al cerrar este aviso no podrás recuperarla; puedes rotarla.</p><textarea aria-label="Token privado del dispositivo" readOnly value={token} rows={3} className="font-mono text-xs" /><div className="mt-3 flex flex-wrap gap-3"><button className="btn btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(token); setNotice("Credencial copiada."); } catch { setError("No se pudo copiar. Selecciona el token y cópialo manualmente."); } }}><Copy size={15} /> Copiar</button><button className="btn btn-secondary" onClick={() => setToken("")}>Ya la guardé</button></div></section>}
    <section className="panel"><h2 className="mb-5 font-semibold">Registrar una estación</h2><form className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={create}><label>Nombre<input name="name" required maxLength={80} placeholder="Estación laboratorio" /></label><label>Ubicación<input name="location" maxLength={160} placeholder="Laboratorio IoT" /></label><label>Intervalo esperado (segundos)<input type="number" name="interval" min={5} max={3600} defaultValue={10} required /></label><button className="btn" disabled={busy}><Plus size={17} /> Registrar dispositivo</button></form></section>
    <div className="grid gap-5 xl:grid-cols-2">{devices.map((device) => {
      const status = deviceStatus(device, now);
      return <article key={device.id} className="panel"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-3 text-cyan-700"><Cpu size={22} aria-hidden="true" /></span><div><h2 className="font-semibold">{device.name}</h2><p className="mt-1 text-xs muted">{device.location || "Sin ubicación"}</p></div></div><span className={`badge ${status === "online" ? "badge-ok" : "badge-warn"}`}>{statusLabels[status]}</span></div>
        <dl className="my-6 space-y-3 text-xs"><div><dt className="muted">Identificador</dt><dd className="mt-1 break-all font-mono">{device.id}</dd></div><div className="flex justify-between gap-4"><dt className="muted">Última transmisión</dt><dd>{formatDate(device.last_received_at)}</dd></div><div className="flex justify-between"><dt className="muted">Intervalo esperado</dt><dd>{device.expected_interval_seconds} s</dd></div><div><dt className="muted">Sensores</dt><dd className="mt-1">Temperatura · MQ-135 · LDR.</dd></div></dl>
        {device.owner_id === userId ? <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button disabled={busy} className="btn btn-secondary" onClick={() => void change(device, "toggle")}>{device.is_active ? "Deshabilitar" : "Habilitar"}</button><button disabled={busy} className="btn btn-secondary" onClick={() => void change(device, "rotate")}>Rotar token</button><button disabled={busy} className="btn btn-danger" onClick={() => void change(device, "revoke")}>Revocar token</button></div> : <span className="badge">Acceso de consulta</span>}
      </article>;
    })}</div>
    {!devices.length && <p className="panel text-center text-sm muted">Aún no has registrado dispositivos.</p>}
  </>;
}
