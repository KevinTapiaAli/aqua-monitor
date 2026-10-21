"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Activity, BookOpen, Cpu, Droplets, LayoutDashboard, LoaderCircle, LogOut, Settings2, ShieldCheck } from "lucide-react";
import { useDevices } from "./device-provider";
import { logout } from "@/app/(auth)/actions";

const navigation = [
  { href: "/dashboard", label: "Vista general", icon: LayoutDashboard },
  { href: "/dashboard/history", label: "Historial", icon: BookOpen },
  { href: "/dashboard/devices", label: "Dispositivos", icon: Cpu },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings2 },
];
function SignOutButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" type="submit">{pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}{pending ? "Saliendo…" : "Salir"}</button>;
}
export function AppShell({ email, displayName, children }: { email: string; displayName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { devices, selectedId, select } = useDevices();
  return <div className="min-h-screen lg:pl-64">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-4">Saltar al contenido</a>
    <aside className="flex flex-col bg-[#102e40] p-4 text-slate-200 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:p-5">
      <Link href="/" className="flex items-center gap-3 px-2 py-3 text-xl font-bold text-white"><Droplets className="size-8 text-cyan-300" aria-hidden="true" /> Aqua Monitor</Link>
      <p className="mb-8 ml-13 hidden text-[10px] uppercase tracking-[.18em] text-cyan-200/70 lg:block">Monitoreo ambiental</p>
      <p className="eyebrow mb-3 hidden px-3 text-slate-400 lg:block">Espacio de trabajo</p>
      <nav aria-label="Espacio de trabajo" className="mt-2 grid grid-cols-4 gap-1 lg:flex lg:flex-col">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-3 text-[10px] sm:text-xs lg:flex-row lg:gap-3 lg:px-3 lg:text-sm ${pathname === href ? "bg-cyan-800/70 text-white" : "hover:bg-white/5"}`}><Icon size={18} className="shrink-0" aria-hidden="true" /><span className="max-w-full truncate">{label}</span></Link>)}</nav>
      <div className="mt-auto hidden pt-16 lg:block"><div className="rounded-xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="mb-3 text-cyan-300" size={22} aria-hidden="true" /><p className="text-sm font-semibold text-white">Mediciones con contexto</p><p className="mt-2 text-xs leading-5 text-slate-400">Lecturas ambientales con contexto. MQ-135: respuesta analógica; LDR: luz relativa.</p></div><Link href="/swagger" className="mt-5 block px-3 text-xs text-slate-400 hover:text-white">API · Swagger ↗</Link></div>
    </aside>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:px-9">
      <div className="flex items-center gap-2 text-sm font-medium"><Activity size={17} className="text-cyan-700" aria-hidden="true" /> Plataforma de monitoreo</div>
      <div className="flex max-w-full items-center gap-3"><Link href="/dashboard/settings" className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-bold text-cyan-800" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block max-w-40 truncate text-xs font-semibold">{displayName}</span><span className="mt-0.5 block max-w-40 truncate text-[11px] text-slate-500" title={email}>{email}</span></span></Link><form action={logout}><SignOutButton /></form></div>
    </header>
    <main id="main-content" className="mx-auto max-w-[1600px] space-y-7 p-5 lg:p-9">
      <div className="flex flex-wrap items-center justify-between gap-4"><p className="eyebrow">Sistema IoT multiparamétrico</p><label className="w-full text-xs sm:w-64">Estación seleccionada<select value={selectedId} onChange={(event) => select(event.target.value)} disabled={!devices.length}>{!devices.length && <option value="">Sin dispositivos</option>}{devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label></div>
      {children}
      <footer className="border-t border-slate-200 pt-5 text-xs leading-5 muted">Temperatura · Gas · Luz <span className="mx-2">/</span> Horarios: Bolivia (UTC−4). Sin datos simulados.</footer>
    </main>
  </div>;
}
