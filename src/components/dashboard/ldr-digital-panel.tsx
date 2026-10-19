
"use client";

import type { Measurement } from "@/types/domain";

type DigitalState = 0 | 1;

function getDigitalState(row: Measurement): DigitalState | null {
  const raw = row.raw;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const item = raw["light_digital"];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }

  const value = item["value"];
  const unit = item["unit"];

  if (unit !== "state") return null;
  return value === 0 || value === 1 ? value : null;
}

export function LdrDigitalPanel({ rows }: { rows: Measurement[] }) {
  const history = rows
    .map((row) => ({
      id: row.id,
      date: row.received_at,
      state: getDigitalState(row),
    }))
    .filter(
      (item): item is typeof item & { state: DigitalState } =>
        item.state !== null
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const latest = history[0];
  const zero = history.filter((r) => r.state === 0).length;
  const one = history.filter((r) => r.state === 1).length;

  return (
    <section className="panel space-y-4">
      <div>
        <h2 className="text-xl font-semibold">LDR digital</h2>
        <p className="mt-1 text-sm text-slate-500">
          Lectura DO desde GPIO 34. Estado 0 o 1;
          la polaridad de luz y oscuridad está pendiente.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Último estado", latest ? String(latest.state) : "--"],
          ["Lecturas en estado 0", String(zero)],
          ["Lecturas en estado 1", String(one)],
        ].map(([title, value]) => (
          <div key={title} className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm text-slate-600">{title}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <h3 className="font-semibold">Historial digital</h3>

      {history.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aún no se han recibido estados digitales del LDR.
        </p>
      ) : (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Fecha de recepción</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 20).map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">
                    {new Date(item.date).toLocaleString("es-BO", {
                      timeZone: "America/La_Paz",
                    })}
                  </td>
                  <td className="py-2 font-semibold">{item.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
