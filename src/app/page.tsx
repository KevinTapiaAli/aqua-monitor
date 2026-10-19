import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BellRing, ChartNoAxesCombined, Cpu, Droplets, History, LockKeyhole, Radio, ShieldCheck, Waves } from "lucide-react";
import { ParameterExplorer } from "@/components/home/parameter-explorer";
import { hasPublicConfig } from "@/lib/supabase/env";

const features = [
  { icon: Radio, number: "01", title: "Sigue cada lectura", text: "Consulta tus cuatro parámetros, la última recepción y el estado de cada estación desde una misma vista." },
  { icon: History, number: "02", title: "Encuentra el contexto", text: "Explora el historial por fechas, compara la evolución de los sensores y exporta tus registros a CSV." },
  { icon: BellRing, number: "03", title: "Presta atención a los cambios", text: "Define tus propios umbrales y revisa los eventos que necesitan seguimiento, con su fecha y medición de origen." },
];
export default function Home() {
  const configured = hasPublicConfig();
  return <div className="min-h-screen bg-[#f8faf9]">
    <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-4">Saltar al contenido</a>
    <header className="border-b border-slate-200/70 bg-white/85">
      <nav aria-label="Principal" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight"><span className="rounded-xl bg-cyan-800 p-2 text-white"><Droplets size={23} aria-hidden="true" /></span>Aqua Monitor<span className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[9px] tracking-widest text-slate-500 sm:inline">IoT</span></Link>
        <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex"><a className="hover:text-cyan-800" href="#plataforma">Plataforma</a><a className="hover:text-cyan-800" href="#parametros">Parámetros</a><a className="hover:text-cyan-800" href="#tu-espacio">Tu espacio</a></div>
        <Link href="/login" className="btn btn-secondary text-xs! sm:text-sm!">Iniciar sesión <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </nav>
    </header>
    <main id="contenido">
      <section className="hero-surface relative overflow-hidden border-b border-slate-200/70">
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div>
            <p className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-cyan-800"><span className="h-px w-7 bg-cyan-700" /> Monitoreo ambiental conectado</p>
            <h1 className="max-w-xl text-[clamp(2.9rem,5.5vw,4.65rem)] font-semibold leading-[1.04] tracking-[-.055em] text-[#153b46]">Conoce tu entorno.<br /><span className="text-[#0c8798]">Comprende<br className="hidden lg:block" /> cada cambio.</span></h1>
            <p className="mt-7 max-w-md text-base leading-7 text-slate-600 sm:text-lg">De tus sensores a una visión clara. Reúne las mediciones de temperatura, humedad del suelo, gas y luz en un solo espacio.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/register" className="btn px-6! py-3.5!">Crear mi cuenta <ArrowRight size={17} aria-hidden="true" /></Link><a href="#parametros" className="btn btn-secondary px-6! py-3.5!">Explorar parámetros <ArrowDown size={16} aria-hidden="true" /></a></div>
            <p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} aria-hidden="true" /> Acceso personal · Estaciones protegidas · Datos con contexto</p>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-[#e7f2f1] shadow-[0_24px_80px_-28px_#19546640]">
              <div className="relative z-10 flex items-center justify-between px-6 pt-6 text-xs"><span className="flex items-center gap-2 font-semibold text-teal-900"><Waves size={18} aria-hidden="true" /> Observación multiparamétrica</span><span className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] text-slate-600">4 variables</span></div>
              <svg viewBox="0 0 500 380" className="w-full" role="img" aria-label="Ilustración conceptual de cuatro sensores ambientales">
                <defs>
                  <linearGradient id="water-top" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7fd6cd" /><stop offset="1" stopColor="#35a6b5" /></linearGradient>
                  <linearGradient id="water-side" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#15869d" /><stop offset="1" stopColor="#0e566f" /></linearGradient>
                  <linearGradient id="water-left" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#52bfbc" /><stop offset="1" stopColor="#208694" /></linearGradient>
                </defs>
                <ellipse cx="250" cy="319" rx="174" ry="32" fill="#165e6a" opacity=".09" />
                <path d="M78 182 250 106 422 182 250 260Z" fill="url(#water-top)" />
                <path d="M78 182 250 260 250 332 78 252Z" fill="url(#water-left)" />
                <path d="M250 260 422 182 422 252 250 332Z" fill="url(#water-side)" />
                <g fill="none" stroke="#ddfffa" strokeWidth="1.5" opacity=".5"><ellipse cx="250" cy="182" rx="104" ry="43" /><ellipse cx="250" cy="182" rx="70" ry="29" /><ellipse cx="250" cy="182" rx="36" ry="15" /><path d="M80 205 250 283 420 205M80 225 250 304 420 225" /></g>
                <g stroke="#337e87" strokeDasharray="4 5" fill="none"><path d="M145 102v71M250 62v104M355 102v71M250 266v28" /></g>
                <g fill="#fff" stroke="#d3e6e5"><rect x="101" y="69" width="88" height="35" rx="12" /><rect x="207" y="27" width="86" height="35" rx="12" /><rect x="311" y="69" width="88" height="35" rx="12" /><rect x="209" y="290" width="82" height="35" rx="12" /></g>
                <g fill="#175361" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="600" textAnchor="middle"><text x="145" y="91">Humedad</text><text x="250" y="49">°C</text><text x="355" y="91">MQ-135</text><text x="250" y="312">LDR</text></g>
                <circle cx="250" cy="182" r="5" fill="#efffff" /><circle cx="145" cy="175" r="3" fill="#efffff" /><circle cx="355" cy="175" r="3" fill="#efffff" />
              </svg>
              <div className="grid grid-cols-3 gap-3 border-t border-white/70 bg-white/65 px-6 py-5 text-center"><div><p className="text-sm font-semibold text-teal-950">Sensores</p><p className="mt-1 text-[10px] text-slate-500">Adquisición</p></div><div className="border-x border-slate-200/70"><p className="text-sm font-semibold text-teal-950">Estaciones</p><p className="mt-1 text-[10px] text-slate-500">Conexión</p></div><div><p className="text-sm font-semibold text-teal-950">Información</p><p className="mt-1 text-[10px] text-slate-500">Seguimiento</p></div></div>
            </div>
            <p className="mt-4 text-center text-[11px] text-slate-500">Ilustración del sistema. Las mediciones provienen de tus sensores.</p>
          </div>
        </div>
      </section>
      <section id="plataforma" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow text-cyan-700">Una visión más completa</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Del dato al seguimiento.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-500">Herramientas para observar, comparar y conservar el contexto de cada medición.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, number, title, text }) => <article key={number} className="rounded-2xl border border-slate-200 bg-white p-7"><div className="flex items-center justify-between"><span className="rounded-xl bg-cyan-50 p-3 text-cyan-800"><Icon size={23} aria-hidden="true" /></span><span className="text-xs font-medium text-slate-400">{number}</span></div><h3 className="mt-7 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{text}</p></article>)}</div>
      </section>
      <section id="parametros" className="scroll-mt-8 border-y border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="mb-9"><p className="eyebrow text-cyan-700">Explora lo que observamos</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Cuatro variables. Más perspectiva.</h2></div><ParameterExplorer /></div></section>
      <section id="tu-espacio" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8">
        <div className="grid gap-10 rounded-3xl bg-[#103e4b] px-7 py-12 text-white sm:px-12 lg:grid-cols-[1.1fr_1fr]">
          <div><span className="inline-flex rounded-xl border border-white/15 p-3 text-cyan-200"><LockKeyhole size={24} aria-hidden="true" /></span><h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Tu monitoreo.<br />Tu espacio de trabajo.</h2><p className="mt-5 max-w-md text-sm leading-7 text-slate-300">Organiza tus estaciones con una cuenta personal. Cada dispositivo tiene su identidad y tus datos quedan disponibles para los usuarios autorizados.</p><Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-cyan-950 hover:bg-cyan-50">Comenzar <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <div className="flex flex-col justify-center gap-6">{[{ icon: Cpu, title: "Estaciones identificadas", text: "Un nombre, una ubicación y una credencial por dispositivo." }, { icon: ChartNoAxesCombined, title: "Lecturas interpretables", text: "Unidades, calidad de lectura y calibraciones junto a tus datos." }, { icon: ShieldCheck, title: "Acceso controlado", text: "Autenticación y permisos para consultar y administrar cada estación." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 border-b border-white/10 pb-6 last:border-0 last:pb-0"><Icon size={21} className="mt-1 shrink-0 text-cyan-300" aria-hidden="true" /><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{text}</p></div></div>)}</div>
        </div>
        {!configured && <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-500"><span className="size-1.5 shrink-0 rounded-full bg-amber-500" /> Entorno local: la conexión de cuentas y datos está pendiente de configurar.</p>}
      </section>
    </main>
    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-8 sm:px-8"><div><Link href="/" className="flex items-center gap-2 text-sm font-bold"><Droplets size={18} className="text-cyan-700" aria-hidden="true" /> Aqua Monitor</Link><p className="mt-2 max-w-xl text-xs leading-6 text-slate-500">Las lecturas de gas y luz son analógicas; no representan CO₂ en ppm ni iluminación en lux.</p></div><div className="flex gap-5 text-xs text-slate-600"><Link href="/login" className="hover:text-cyan-800">Acceder</Link><Link href="/swagger" className="hover:text-cyan-800">API · Swagger <span aria-hidden="true">↗</span></Link></div></div></footer>
  </div>;
}
