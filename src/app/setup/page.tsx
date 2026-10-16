import Link from "next/link";
import { Droplets } from "lucide-react";

export default function SetupPage() {
  return <main className="mx-auto max-w-2xl px-5 py-20"><Droplets className="mb-6 size-12 text-cyan-700" aria-hidden="true" />
    <p className="eyebrow">Aqua Monitor · Instalación</p><h1 className="mt-3 text-3xl font-bold">Conecta tu proyecto Supabase</h1>
    <div className="panel mt-8 space-y-5"><p>La aplicación necesita su base de datos y autenticación para comenzar.</p>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-6"><li>Copia <code>.env.example</code> como <code>.env.local</code> y completa las variables.</li>
        <li>Aplica en Supabase las migraciones SQL de <code>supabase/migrations</code>, en orden.</li>
        <li>Configura las URL de autenticación indicadas en <code>docs/SETUP.md</code>.</li>
        <li>Reinicia manualmente el servidor y crea tu cuenta.</li></ol>
      <div className="flex flex-wrap gap-3"><Link className="btn" href="/login">Ir al inicio de sesión</Link><Link className="btn btn-secondary" href="/swagger">Abrir Swagger</Link></div>
    </div>
  </main>;
}
