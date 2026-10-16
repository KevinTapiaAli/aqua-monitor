"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
export function readCoefficients(form: FormData): Record<string, number> {
  const names = form.getAll("coefficient_name").map((value) => String(value).trim());
  const values = form.getAll("coefficient_value").map(Number);
  if (new Set(names).size !== names.length) throw new Error("Cada coeficiente debe tener un nombre diferente.");
  if (names.some((name) => !name || name.length > 40) || values.some((value) => !Number.isFinite(value))) throw new Error("Revisa los nombres y valores de los coeficientes.");
  return Object.fromEntries(names.map((name, index) => [name, values[index]]));
}
export function CalibrationCoefficients() {
  const [rows, setRows] = useState<number[]>([]);
  const [nextId, setNextId] = useState(0);
  return <div className="space-y-3 md:col-span-2">
    <p className="text-sm font-semibold">Coeficientes del procedimiento <span className="font-normal muted">(opcional)</span></p>
    <p className="text-xs leading-5 muted">Añade únicamente los coeficientes obtenidos en tu calibración real.</p>
    {rows.map((id) => <div key={id} className="flex flex-wrap items-end gap-3"><label className="min-w-32 flex-1">Nombre<input name="coefficient_name" required maxLength={40} /></label><label className="min-w-32 flex-1">Valor<input name="coefficient_value" type="number" step="any" required /></label><button type="button" className="btn btn-secondary mb-0.5" aria-label="Quitar coeficiente" onClick={() => setRows((current) => current.filter((row) => row !== id))}><Trash2 size={16} aria-hidden="true" /></button></div>)}
    <button type="button" className="btn btn-secondary" disabled={rows.length >= 20} onClick={() => { setRows((current) => [...current, nextId]); setNextId((current) => current + 1); }}><Plus size={15} aria-hidden="true" /> Añadir coeficiente</button>
  </div>;
}
