"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { api } from "@/lib/api/client";
import type { Alert, Device, Measurement, PageResult } from "@/types/domain";

export const LIVE_HISTORY_MS = 2 * 60 * 60 * 1000;

function mergeRows(existing: Measurement[], incoming: Measurement[], now: number) {
  const ordered = [...new Map([...existing, ...incoming].map((row) => [row.id, row])).values()]
    .sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at) || b.id.localeCompare(a.id));
  return ordered.filter((row, index) => index === 0 || Date.parse(row.received_at) >= now - LIVE_HISTORY_MS);
}

async function loadWindow(deviceId: string, end: number, signal: AbortSignal): Promise<Measurement[]> {
  const query = new URLSearchParams({
    device_id: deviceId,
    from: new Date(end - LIVE_HISTORY_MS).toISOString(),
    to: new Date(end).toISOString(),
    limit: "500",
  });
  const rows: Measurement[] = [];
  let cursor: string | null;
  do {
    const page: PageResult<Measurement> = await api(`measurements?${query}`, { signal });
    rows.push(...page.items);
    cursor = page.next_cursor;
    if (cursor) query.set("cursor", cursor);
  } while (cursor);
  if (rows.length) return rows;
  // La última recepción sigue disponible para el medidor aunque haya quedado fuera de la ventana de la gráfica.
  const latest = await api<Measurement | null>(`measurements/latest?device_id=${deviceId}`, { signal });
  return latest ? [latest] : [];
}
export function useLiveMeasurements(initialDevice: Device) {
  const [device, setDevice] = useState(initialDevice);
  const [rows, setRows] = useState<Measurement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Conectando");
  const [now, setNow] = useState(() => Date.now());
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const supabase = browserClient();
    let syncRequest: AbortController | undefined;
    let active = true;
    let generation = 0;
    let alertUpdates: Alert[] | null = null;
    async function sync() {
      // Cancelar y versionar la sincronización evita que un intento anterior sobrescriba el estado recuperado al reconectar.
      syncRequest?.abort();
      const request = new AbortController();
      syncRequest = request;
      const requestGeneration = ++generation;
      const end = Date.now();
      setLoading(true);
      alertUpdates = [];
      try {
        const suffix = `device_id=${initialDevice.id}`;
        const [history, pending, devices] = await Promise.all([
          loadWindow(initialDevice.id, end, request.signal),
          api<Alert[]>(`alerts?${suffix}`, { signal: request.signal }),
          api<Device[]>("devices", { signal: request.signal }),
        ]);
        if (!active || requestGeneration !== generation) return;
        const fresh = devices.find((d) => d.id === initialDevice.id);
        if (!fresh) {
          setRows([]); setAlerts([]);
          setError("La estación ya no está disponible para esta cuenta.");
          return;
        }
        const syncedAt = Date.now();
        setNow(syncedAt);
        setRows((previous) => mergeRows(history, previous, syncedAt));
        // Los cambios Realtime que llegaron durante la consulta se aplican después de la respuesta para conservar el estado más reciente.
        const reconciled = new Map(pending.map((a) => [a.id, a]));
        for (const update of alertUpdates ?? []) {
          if (update.acknowledged_at) reconciled.delete(update.id);
          else reconciled.set(update.id, update);
        }
        alertUpdates = null;
        setAlerts([...reconciled.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50));
        setDevice((previous) => ({ ...fresh, last_received_at: previous.last_received_at && (!fresh.last_received_at || Date.parse(previous.last_received_at) > Date.parse(fresh.last_received_at)) ? previous.last_received_at : fresh.last_received_at }));
        setError("");
      } catch (failure) {
        if (active && requestGeneration === generation && !request.signal.aborted) {
          request.abort();
          setError(failure instanceof Error ? failure.message : "No se pudo recuperar la estación.");
        }
      } finally { if (active && requestGeneration === generation) { alertUpdates = null; setLoading(false); } }
    }
    void sync();
    const channel = supabase.channel(`station-${initialDevice.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "measurements", filter: `device_id=eq.${initialDevice.id}` }, (payload) => {
        const row = payload.new as Measurement;
        const receivedAt = Date.now();
        setNow(receivedAt);
        setRows((previous) => mergeRows(previous, [row], receivedAt));
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
        setConnection(status === "SUBSCRIBED" ? "En vivo" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "Reconectando" : status === "CLOSED" ? "Desconectado" : "Conectando");
        // Recupera la ventana reciente después de conectar, sin polling de red.
        if (status === "SUBSCRIBED") void sync();
      });
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => { active = false; syncRequest?.abort(); window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [initialDevice.id, revision]);

  async function acknowledge(id: string) {
    await api(`alerts/${id}/acknowledge`, { method: "POST" });
    setAlerts((previous) => previous.filter((a) => a.id !== id));
  }
  return { device, rows, alerts, loading, error, connection, now, acknowledge, retry: () => setRevision((n) => n + 1) };
}
