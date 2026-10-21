"use client";
import { useId, useState } from "react";
import { ArrowUpRight, Droplet, Thermometer, Wind, Sun } from "lucide-react";
import Link from "next/link";

const variables = [
  { key: "temperature", label: "Temperatura", unit: "Grados Celsius · °C", icon: Thermometer, title: "Evolución de la temperatura", text: "Sigue las lecturas de tu DS18B20 y observa sus cambios en tiempo real.", context: "Lecturas originales de la sonda en grados Celsius.", color: "#b45309" },
  { key: "gas", label: "Gas · MQ-135", unit: "Lectura analógica · ADC", icon: Wind, title: "Respuesta del sensor de gas", text: "Observa cambios en la respuesta analógica del MQ-135, conservando sus datos originales.", context: "No representa CO₂ en ppm ni una certificación de calidad del aire.", color: "#6d28d9" },
  { key: "light", label: "Luz · LDR", unit: "Lectura analógica · ADC", icon: Sun, title: "Variaciones de iluminación", text: "Compara la respuesta del LDR ante cambios de luz en el entorno.", context: "La lectura no está expresada en lux y depende del divisor o módulo utilizado.", color: "#047857" },
];
export function ParameterExplorer() {
  const [selected, setSelected] = useState(0);
  const prefix = useId();
  const current = variables[selected];
  const Icon = current.icon;
  return <div className="grid gap-6 lg:grid-cols-[.8fr_1.4fr]">
    <div role="tablist" aria-label="Sensores ambientales" aria-orientation="vertical" className="grid gap-2 self-start">
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
