import Link from "next/link";
import { ArrowLeft, Droplets, Radio, ShieldCheck, Waves } from "lucide-react";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
    <section className="auth-aside relative flex flex-col justify-between overflow-hidden bg-[#0d3042] px-7 py-6 text-white lg:p-14">
      <Link href="/" className="relative z-10 flex w-fit items-center gap-3 text-xl font-bold"><Droplets className="text-cyan-300" aria-hidden="true" /> Aqua Monitor</Link>
      <div className="relative z-10 hidden max-w-lg py-14 lg:block">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Observa. Comprende. Cuida.</p>
        <h2 className="mt-5 text-5xl font-semibold leading-tight tracking-tight">Cada lectura cuenta.<br /><span className="text-cyan-300">Cada gota también.</span></h2>
        <p className="mt-6 max-w-sm leading-7 text-slate-300">Conecta tus estaciones y encuentra en cada medición una nueva perspectiva sobre tu entorno.</p>
        <div className="mt-10 space-y-4 text-sm text-cyan-100"><p className="flex items-center gap-3"><Radio size={18} aria-hidden="true" /> Cuatro parámetros en un solo lugar</p><p className="flex items-center gap-3"><ShieldCheck size={18} aria-hidden="true" /> Tu cuenta, tus dispositivos, tus datos</p></div>
      </div>
      <div className="relative z-10 hidden items-center gap-3 text-xs text-slate-400 lg:flex"><Waves size={24} className="text-cyan-400" aria-hidden="true" /> Tecnología para observar nuestro entorno.</div>
    </section>
    <section className="flex flex-col bg-white px-6 py-8 sm:px-12 lg:px-20">
      <Link href="/" className="mb-10 flex w-fit items-center gap-2 text-xs font-medium text-slate-500 hover:text-cyan-800"><ArrowLeft size={15} aria-hidden="true" /> Volver al inicio</Link>
      <div className="mx-auto my-auto w-full max-w-md pb-10">{children}</div>
      <p className="text-center text-xs text-slate-400">Aqua Monitor · Monitoreo ambiental</p>
    </section>
  </main>;
}
