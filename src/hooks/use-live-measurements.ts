"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { api } from "@/lib/api/client";
import type { Alert, AlertRule, Device, Measurement, PageResult } from "@/types/domain";

function mergeRows(existing: Measurement[], incoming: Measurement[]) {
  return [...new Map([...existing, ...incoming].map((row) => [row.id, row])).values()]
    .sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at) || b.id.localeCompare(a.id)).slice(0, 120);
}
export function useLiveMeasurements(initialDevice: Device) {
  const [device, setDevice] = useState(initialDevice);
  const [rows, setRows] = useState<Measurement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Conectando");
  const [now, setNow] = useState(() => Date.now());
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const supabase = browserClient();
    const abort = new AbortController();
    let active = true;
    let generation = 0;
    let alertUpdates: Alert[] | null = null;
    async function sync() {
      const requestGeneration = ++generation;
      setLoading(true);
      alertUpdates = [];
      try {
        const suffix = `device_id=${initialDevice.id}`;
        const [history, pending, thresholds, devices] = await Promise.all([
          api<PageResult<Measurement>>(`measurements?${suffix}&limit=120`, { signal: abort.signal }),
          api<Alert[]>(`alerts?${suffix}`, { signal: abort.signal }),
          api<AlertRule[]>(`alert-rules?${suffix}`, { signal: abort.signal }),
          api<Device[]>("devices", { signal: abort.signal }),
        ]);
        if (!active || requestGeneration !== generation) return;
        const fresh = devices.find((d) => d.id === initialDevice.id);
        if (!fresh) {
          setRows([]); setAlerts([]); setRules([]);
          setError("La estación ya no está disponible para esta cuenta.");
          return;
        }
        setRows((previous) => mergeRows(history.items, previous));
        const reconciled = new Map(pending.map((a) => [a.id, a]));
        for (const update of alertUpdates ?? []) {
          if (update.acknowledged_at) reconciled.delete(update.id);
          else reconciled.set(update.id, update);
        }
        alertUpdates = null;
        setAlerts([...reconciled.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50));
        setRules(thresholds);
        setDevice((previous) => ({ ...fresh, last_received_at: previous.last_received_at && (!fresh.last_received_at || Date.parse(previous.last_received_at) > Date.parse(fresh.last_received_at)) ? previous.last_received_at : fresh.last_received_at }));
        setError("");
      } catch (failure) {
        if (active && requestGeneration === generation && !abort.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudo recuperar la estación.");
      } finally { if (active && requestGeneration === generation) { alertUpdates = null; setLoading(false); } }
    }
    void sync();
    const channel = supabase.channel(`station-${initialDevice.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "measurements", filter: `device_id=eq.${initialDevice.id}` }, (payload) => {
        const row = payload.new as Measurement;
        setRows((previous) => mergeRows(previous, [row]));
        setDevice((previous) => ({ ...previous, last_received_at: !previous.last_received_at || Date.parse(row.received_at) > Date.parse(previous.last_received_at) ? row.received_at : previous.last_received_at }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `device_id=eq.${initialDevice.id}` }, (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as Alert;
        alertUpdates?.push(row);
        setAlerts((previous) => row.acknowledged_at ? previous.filter((a) => a.id !== row.id) : [row, ...previous.filter((a) => a.id !== row.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "devices", filter: `id=eq.${initialDevice.id}` }, (payload) => setDevice(payload.new as Device))
      .subscribe((status) => {
        if (!active) return;
        setConnection(status === "SUBSCRIBED" ? "En vivo" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "Reconectando" : "Desconectado");
        // Recupera la ventana reciente después de conectar, sin polling de red.
        if (status === "SUBSCRIBED") void sync();
      });
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => { active = false; abort.abort(); window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [initialDevice.id, revision]);

  async function acknowledge(id: string) {
    await api(`alerts/${id}/acknowledge`, { method: "POST" });
    setAlerts((previous) => previous.filter((a) => a.id !== id));
  }
  return { device, rows, alerts, rules, loading, error, connection, now, acknowledge, retry: () => setRevision((n) => n + 1) };
}
