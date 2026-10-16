"use client";
import { useId, useState } from "react";
import { ArrowUpRight, Droplet, FlaskConical, Thermometer, Waves, Zap } from "lucide-react";
import Link from "next/link";

const variables = [
  { key: "ph", label: "pH", unit: "Escala de pH", icon: FlaskConical, title: "Acidez y alcalinidad", text: "Observa cómo cambia el pH del agua y relaciona su evolución con las condiciones de tu punto de monitoreo.", context: "La lectura necesita una sonda identificada y una calibración documentada.", color: "#0e7490" },
  { key: "temperature", label: "Temperatura", unit: "Grados Celsius · °C", icon: Thermometer, title: "El contexto térmico del agua", text: "Sigue los cambios de temperatura a lo largo del tiempo y compáralos con el comportamiento de los otros parámetros.", context: "Cada lectura se conserva en grados Celsius, junto a su estado de calidad.", color: "#b45309" },
  { key: "turbidity", label: "Turbidez", unit: "NTU, V o ADC · según calibración", icon: Waves, title: "Una mirada a las partículas", text: "Registra la respuesta del sensor de turbidez sin perder de vista qué unidad y calibración respaldan el dato.", context: "Solo se muestran NTU cuando la calibración lo permite. Las lecturas sin calibrar se distinguen claramente.", color: "#6d28d9" },
  { key: "ec", label: "Conductividad", unit: "Microsiemens por centímetro · µS/cm", icon: Zap, title: "La respuesta de los iones disueltos", text: "Consulta la conductividad eléctrica y su evolución para estudiar variaciones en el agua de tu estación.", context: "Los límites y la calibración dependen del sensor y del contexto de estudio.", color: "#047857" },
];
export function ParameterExplorer() {
  const [selected, setSelected] = useState(0);
  const prefix = useId();
  const current = variables[selected];
  const Icon = current.icon;
  return <div className="grid gap-6 lg:grid-cols-[.8fr_1.4fr]">
    <div role="tablist" aria-label="Parámetros del agua" aria-orientation="vertical" className="grid gap-2 self-start">
      {variables.map(({ key, label, icon: ItemIcon }, index) => <button key={key} id={prefix + key} role="tab" type="button" aria-selected={selected === index} aria-controls={prefix + "-panel"} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => {
        let next = index;
        if (event.key === "ArrowDown") next = (index + 1) % variables.length;
        else if (event.key === "ArrowUp") next = (index + variables.length - 1) % variables.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = variables.length - 1;
        else return;
        event.preventDefault(); setSelected(next); document.getElementById(prefix + variables[next].key)?.focus();
      }} className={`flex items-center gap-4 rounded-xl border px-5 py-5 text-left text-sm font-semibold transition-colors ${selected === index ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-transparent bg-slate-50/60 text-slate-500 hover:bg-slate-100"}`}><ItemIcon size={21} aria-hidden="true" />{label}<ArrowUpRight className="ml-auto" size={17} aria-hidden="true" /></button>)}
    </div>
    <div id={prefix + "-panel"} role="tabpanel" tabIndex={0} aria-labelledby={prefix + current.key} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f6f9f8] p-7 sm:p-10">
      <Droplet className="pointer-events-none absolute -right-7 -top-8 size-48 text-[#e6efee]" strokeWidth={1} aria-hidden="true" />
      <div className="relative"><Icon size={33} style={{ color: current.color }} aria-hidden="true" /><p className="mt-7 text-xs font-semibold uppercase tracking-wider text-slate-500">{current.unit}</p><h3 className="mt-3 text-2xl font-semibold tracking-tight">{current.title}</h3><p className="mt-4 max-w-lg text-sm leading-7 text-slate-600">{current.text}</p><p className="mt-5 border-l-2 border-cyan-600 pl-4 text-xs leading-6 text-slate-500">{current.context}</p><Link href="/register" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-cyan-800">Lleva tus mediciones a un solo lugar <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    </div>
  </div>;
}
