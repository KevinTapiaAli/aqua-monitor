"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export function ObserverAccess({ deviceId }: { deviceId: string }) {
  const [observers, setObservers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const path = `devices/observers?device_id=${deviceId}`;

  useEffect(() => {
    const controller = new AbortController();
    api<string[]>(path, { signal: controller.signal })
      .then((ids) => { if (!controller.signal.aborted) setObservers(ids); })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudo consultar el acceso.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, revision]);

  async function update(method: "POST" | "DELETE", userId: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const id = await api<string>(path, { method, body: JSON.stringify({ user_id: userId }) });
      setObservers((current) => method === "POST" ? [...new Set([...current, id])] : current.filter((entry) => entry !== id));
      setNotice(method === "POST" ? "Acceso de observador concedido." : "Acceso de observador revocado.");
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo modificar el acceso.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return <details className="mt-5 border-t border-slate-200 pt-4">
    <summary className="cursor-pointer text-sm font-semibold">Gestionar observadores</summary>
    <p className="my-3 text-sm muted">El observador puede consultar lecturas en vivo, revisar el historial y exportar datos. Pídele el identificador que aparece en su perfil.</p>
    {error && <div role="alert" className="message message-error mb-3 flex flex-wrap items-center gap-3">
      {error}
      <button type="button" className="btn btn-secondary" disabled={busy || loading} onClick={() => {
        setError(""); setLoading(true); setRevision((value) => value + 1);
      }}>Actualizar accesos</button>
    </div>}
    {notice && <p role="status" className="message mb-3">{notice}</p>}
    <form className="flex flex-wrap items-end gap-3" onSubmit={async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const id = String(new FormData(form).get("observer") ?? "").trim();
      if (await update("POST", id)) form.reset();
    }}>
      <label className="min-w-0 grow">Identificador del usuario<input name="observer" required maxLength={36} autoComplete="off" /></label>
      <button className="btn" disabled={busy || loading}>Dar acceso</button>
    </form>
    {loading ? <p role="status" className="mt-4 text-sm muted">Consultando observadores…</p> :
      observers.length > 0 ? <ul className="mt-3 divide-y divide-slate-100">
        {observers.map((id) => <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="min-w-0 break-all font-mono text-xs">{id}</span>
          <button type="button" className="btn btn-secondary" aria-label={`Quitar acceso a ${id}`} disabled={busy}
            onClick={() => void update("DELETE", id)}>Quitar acceso</button>
        </li>)}
      </ul> : !error && <p className="mt-4 text-sm muted">Todavía no hay observadores.</p>}
  </details>;
}
