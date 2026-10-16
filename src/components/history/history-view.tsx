"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Filter, RefreshCw } from "lucide-react";
import { useDevices } from "@/components/layout/device-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartPanel } from "@/components/charts/chart-panel";
import { api } from "@/lib/api/client";
import { measurementsCsv } from "@/lib/utils/csv";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { parameterInfo, qualityLabels } from "@/config/parameters";
import { parameters, type Measurement, type PageResult } from "@/types/domain";

type Period = { from: string; to: string };
export function HistoryView() {
  const { device } = useDevices();
  return <><div><h1 className="text-3xl font-bold">Historial de mediciones</h1><p className="mt-2 text-sm muted">Consulta registros, compara variables y descarga tus datos.</p></div>
    {device ? <DeviceHistory key={device.id} deviceId={device.id} /> : <EmptyState title="Todavía no hay estaciones">Registra un dispositivo para consultar su historial.</EmptyState>}
  </>;
}
function DeviceHistory({ deviceId }: { deviceId: string }) {
  const [period, setPeriod] = useState<Period>(() => ({ from: new Date(Date.now() - 86400_000).toISOString(), to: new Date().toISOString() }));
  const [rows, setRows] = useState<Measurement[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportCount, setExportCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const exportAbort = useRef<AbortController | null>(null);
  const pageAbort = useRef<AbortController | null>(null);
  const pageVersion = useRef(0);
  const params = new URLSearchParams({ device_id: deviceId, from: period.from, to: period.to, limit: "120" }).toString();

  useEffect(() => {
    const abort = new AbortController();
    const version = ++pageVersion.current;
    pageAbort.current = abort;
    async function load() {
      setLoading(true); setError(""); setRows([]); setCursor(null);
      try {
        const data = await api<PageResult<Measurement>>(`measurements?${params}`, { signal: abort.signal });
        if (version === pageVersion.current && !abort.signal.aborted) { setRows(data.items); setCursor(data.next_cursor); }
      } catch (e) { if (!abort.signal.aborted) { setRows([]); setCursor(null); setError(e instanceof Error ? e.message : "No se pudo cargar el historial."); } }
      finally { if (!abort.signal.aborted) setLoading(false); }
    }
    void load();
    return () => { abort.abort(); exportAbort.current?.abort(); };
  }, [params, revision]);

  async function more() {
    if (!cursor) return;
    setLoading(true); setError("");
    const version = pageVersion.current;
    try {
      const data = await api<PageResult<Measurement>>(`measurements?${params}&cursor=${encodeURIComponent(cursor)}`, { signal: pageAbort.current?.signal });
      if (version !== pageVersion.current) return;
      setRows((previous) => [...new Map([...previous, ...data.items].map((m) => [m.id, m])).values()]); setCursor(data.next_cursor);
    } catch (e) { if (version === pageVersion.current && !pageAbort.current?.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar la página."); }
    finally { if (version === pageVersion.current) setLoading(false); }
  }
  function filter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = new Date(`${form.get("from")}:00Z`);
    const to = new Date(`${form.get("to")}:00Z`);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to || to.getTime() - from.getTime() > 31 * 86400_000) {
      setError("Selecciona un periodo válido de hasta 31 días."); return;
    }
    setPeriod({ from: from.toISOString(), to: to.toISOString() });
  }
  async function exportCsv() {
    const controller = new AbortController();
    exportAbort.current = controller;
    setExporting(true); setExportCount(0); setError("");
    try {
      const exportParams = new URLSearchParams({ device_id: deviceId, from: period.from, to: period.to, limit: "500" });
      let next: string | null = null;
      const result: Measurement[] = [];
      do {
        if (next) exportParams.set("cursor", next);
        const page: PageResult<Measurement> = await api(`measurements?${exportParams}`, { signal: controller.signal });
        result.push(...page.items); next = page.next_cursor; setExportCount(result.length);
        if (result.length >= 10_000 && next) throw new Error("El periodo supera 10 000 registros. Reduce el rango para exportarlo completo.");
      } while (next);
      if (controller.signal.aborted) return;
      const href = URL.createObjectURL(new Blob([measurementsCsv(result)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = href; link.download = `aqua-${deviceId}-${period.from.slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo exportar."); }
    finally { setExporting(false); }
  }
  return <>
    <form onSubmit={filter} className="panel flex flex-wrap items-end gap-4"><label className="grow">Desde (UTC)<input type="datetime-local" name="from" defaultValue={period.from.slice(0, 16)} required /></label><label className="grow">Hasta (UTC, excluido)<input type="datetime-local" name="to" defaultValue={period.to.slice(0, 16)} required /></label><button disabled={loading || exporting} className="btn"><Filter size={15} aria-hidden="true" /> Filtrar</button><button type="button" className="btn btn-secondary" disabled={loading || exporting} onClick={() => void exportCsv()}><Download size={15} aria-hidden="true" /> Exportar periodo CSV</button>{exporting && <button type="button" className="btn btn-secondary" onClick={() => exportAbort.current?.abort()}>Cancelar ({exportCount})</button>}</form>
    <p className="text-xs muted">Filtro por hora de recepción. Hasta 31 días por consulta y 10 000 registros por exportación. Las estadísticas y los gráficos describen los registros cargados.</p>
    {error && <div role="alert" className="message message-error flex flex-wrap items-center justify-between gap-3">{error}<button className="btn btn-secondary" onClick={() => setRevision((n) => n + 1)}><RefreshCw size={14} /> Reintentar</button></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{parameters.map((p) => {
      const values = rows.filter((r) => r.quality[p] === "ok").map((r) => r[p]).filter((v): v is number => v !== null);
      const sum = values.reduce((total, value) => total + value, 0);
      return <section className="panel" key={p}><p className="text-sm font-semibold">{parameterInfo[p].label}</p><p className="mt-3 text-2xl font-semibold">{formatNumber(values.length ? sum / values.length : null)} <span className="text-xs muted">{parameterInfo[p].unit}</span></p><p className="mt-2 text-xs muted">Promedio de {values.length} lecturas válidas</p><p className="mt-2 text-xs muted">Mín. {formatNumber(values.length ? Math.min(...values) : null)} · Máx. {formatNumber(values.length ? Math.max(...values) : null)}</p></section>;
    })}</div>
    {Boolean(rows.length) && <div className="grid gap-5 xl:grid-cols-2">{parameters.map((p) => <ChartPanel key={p} rows={rows} parameter={p} />)}</div>}
    <section className="panel overflow-hidden !p-0"><div className="flex items-center justify-between p-5"><h2 className="font-semibold">Registros recibidos</h2><span className="badge">{rows.length} cargados</span></div><div className="overflow-x-auto"><table><caption className="sr-only">Mediciones recibidas en el periodo seleccionado, de más reciente a más antigua</caption><thead><tr><th>Recepción / adquisición</th>{parameters.map((p) => <th key={p}>{parameterInfo[p].label}</th>)}<th>Datos originales</th></tr></thead><tbody>{rows.map((m) => <tr key={m.id}><td className="whitespace-nowrap"><p>{formatDate(m.received_at)}</p><p className="mt-1 text-xs muted">{m.measured_at ? formatDate(m.measured_at) : "Reloj sin sincronizar"}</p></td>{parameters.map((p) => <td key={p}><span className="whitespace-nowrap font-medium">{formatNumber(m[p])} {p === "turbidity_value" ? m.turbidity_unit : parameterInfo[p].unit}</span><p className="mt-1 text-xs muted">{qualityLabels[m.quality[p]]}</p></td>)}<td><details><summary className="cursor-pointer text-xs text-cyan-800">Ver lectura original</summary><pre className="mt-2 max-w-60 overflow-auto text-xs">{JSON.stringify(m.raw, null, 2)}</pre><p className="mt-2 text-xs muted">ID: {m.reading_id}</p></details></td></tr>)}</tbody></table></div>
      {!rows.length && !loading && <p className="p-8 text-center text-sm muted">No hay mediciones para este periodo.</p>}
      <div className="flex justify-center border-t border-slate-100 p-4">{loading ? <p role="status" className="text-sm muted">Cargando registros…</p> : cursor && rows.length < 5000 ? <button className="btn btn-secondary" onClick={() => void more()}>Cargar más</button> : <p className="text-xs muted">{cursor ? "Límite de vista: 5 000 registros. Reduce el periodo o exporta CSV." : "Fin de los registros del periodo"}</p>}</div>
    </section>
  </>;
}
