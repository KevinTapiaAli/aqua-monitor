"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { PrivacyDetails } from "@/types/domain";

export function PrivacyEditor({ details }: { details: PrivacyDetails }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("contact_email") ?? "").trim();
    const retention = String(form.get("retention_months") ?? "").trim();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await api<PrivacyDetails>("privacy-details", {
        method: "PUT",
        body: JSON.stringify({
          responsible_name: form.get("responsible_name"),
          contact_email: email || null,
          retention_months: retention ? Number(retention) : null,
        }),
      });
      setMessage("Se guardaron los datos de privacidad.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudieron guardar los datos.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel space-y-4">
    <h2 className="font-semibold">Privacidad del proyecto</h2>
    <p className="text-sm muted">Estos datos aparecen en la página pública de privacidad. Usa un correo que el equipo supervise.</p>
    <form onSubmit={save}>
      <fieldset disabled={busy} className="grid items-end gap-4 md:grid-cols-3">
        <label>Equipo responsable<input name="responsible_name" defaultValue={details.responsible_name} required maxLength={100} /></label>
        <label>Correo de contacto<input type="email" name="contact_email" defaultValue={details.contact_email ?? ""} maxLength={254} /></label>
        <label>Conservación en meses<input type="number" name="retention_months" defaultValue={details.retention_months ?? ""} min={1} max={2147483647} step={1} /></label>
        <div className="flex flex-wrap items-center gap-4 md:col-span-3">
          <button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar datos de privacidad"}</button>
          <Link href="/privacy" className="text-sm text-cyan-800 underline">Ver página pública</Link>
        </div>
      </fieldset>
    </form>
    {message && <p className="message" role="status">{message}</p>}
    {error && <p className="message message-error" role="alert">{error}</p>}
  </section>;
}
