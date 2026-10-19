"use client";
import { useState } from "react";
import { parameterInfo } from "@/config/parameters";
import { parameters, type Parameter, type SensorLimits } from "@/types/domain";

export function readSensorLimits(form: FormData): SensorLimits {
  const limits: SensorLimits = {};
  for (const parameter of parameters) {
    if (form.get(parameter + "_enabled") !== "on") continue;
    const min = Number(form.get(parameter + "_min"));
    const max = Number(form.get(parameter + "_max"));
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) throw new Error(parameterInfo[parameter].label + ": el mínimo debe ser menor que el máximo.");
    limits[parameter] = { min, max, unit: String(form.get(parameter + "_unit")), reference: String(form.get(parameter + "_reference")).trim() };
  }
  return limits;
}
export function SensorLimitsEditor({ limits }: { limits: SensorLimits }) {
  return <div className="space-y-3">
    <div><h3 className="text-sm font-semibold">Rangos admitidos por tus sensores</h3><p className="mt-2 text-xs leading-6 muted">Activa un rango solo cuando dispongas de la ficha técnica. Son especificaciones del sensor; los umbrales de advertencia se configuran por separado.</p></div>
    {parameters.map((parameter) => <SensorLimit key={parameter} parameter={parameter} limit={limits[parameter]} />)}
  </div>;
}
function SensorLimit({ parameter, limit }: { parameter: Parameter; limit: SensorLimits[Parameter] }) {
  const [enabled, setEnabled] = useState(Boolean(limit));
  return <div className="rounded-xl border border-slate-200 p-4">
    <label className="flex items-center gap-3"><input type="checkbox" name={parameter + "_enabled"} checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />{parameterInfo[parameter].label}<span className="ml-auto hidden text-xs font-normal muted sm:inline">{enabled ? "Con especificación" : "Por confirmar"}</span></label>
    {enabled && <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <label>Mínimo<input name={parameter + "_min"} type="number" step="any" required defaultValue={limit?.min} /></label>
      <label>Máximo<input name={parameter + "_max"} type="number" step="any" required defaultValue={limit?.max} /></label>
      <label>Unidad<select name={parameter + "_unit"} defaultValue={limit?.unit ?? parameterInfo[parameter].unit}>{[parameterInfo[parameter].unit].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
      <label className="sm:col-span-3">Referencia de la especificación<input name={parameter + "_reference"} required minLength={3} maxLength={300} defaultValue={limit?.reference} placeholder="Modelo, ficha técnica y sección del fabricante" /></label>
    </div>}
  </div>;
}
