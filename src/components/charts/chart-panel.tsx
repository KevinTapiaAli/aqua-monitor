"use client";
import dynamic from "next/dynamic";
import type { Measurement, Parameter } from "@/types/domain";
import { parameterInfo } from "@/config/parameters";

const Chart = dynamic(() => import("./measurement-chart"), { ssr: false, loading: () => <div className="flex h-56 items-center justify-center text-sm muted">Cargando gráfico…</div> });
export function ChartPanel({ rows, parameter }: { rows: Measurement[]; parameter: Parameter }) {
  const info = parameterInfo[parameter];
  const unit = info.unit;
  return <section className="panel min-w-0"><div className="mb-5 flex items-center justify-between"><h3 className="text-sm font-semibold">{info.label}</h3><span className="text-xs muted">{unit}</span></div>
    {rows.length ? <Chart rows={rows} parameter={parameter} unit={unit} /> : <div className="flex h-56 items-center justify-center text-sm muted">Esperando mediciones</div>}
    <p className="mt-3 text-[11px] muted">Hora de recepción · Se separan unidades y se omiten valores inválidos.</p>
  </section>;
}
