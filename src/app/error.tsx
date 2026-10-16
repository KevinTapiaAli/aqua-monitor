"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-bold">No se pudo cargar esta pantalla</h1><p className="my-5 muted">Comprueba la configuración y vuelve a intentarlo.</p><button className="btn" onClick={reset}>Reintentar</button></main>;
}
