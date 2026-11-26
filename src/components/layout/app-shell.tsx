"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { BookOpen, Cpu, Droplets, LayoutDashboard, LoaderCircle, LogOut, Settings2 } from "lucide-react";
import { useDevices } from "./device-provider";
import { logout } from "@/app/(auth)/actions";

const navigation = [
  { href: "/dashboard", label: "Ambiente", icon: LayoutDashboard },
  { href: "/dashboard/history", label: "Historial", icon: BookOpen },
  { href: "/dashboard/devices", label: "Dispositivos", icon: Cpu },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings2 },
];

function SignOutButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="monitor-action" type="submit">
    {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
    {pending ? "Saliendo…" : "Salir"}
  </button>;
}

export function AppShell({ email, displayName, children }: { email: string; displayName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { devices, device, selectedId, select, userId } = useDevices();
  const overview = pathname === "/dashboard";
  const role = device && (device.owner_id === userId ? "Administrador" : "Observador");

  return <div className={overview ? "monitor-shell min-h-screen" : "min-h-screen"}>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-4 focus:text-slate-900">Saltar al contenido</a>
    <header className="monitor-header">
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2.5 rounded font-semibold text-white">
          <Droplets className="text-sky-300" size={24} aria-hidden="true" /> Aqua Monitor
        </Link>
        <nav aria-label="Espacio de trabajo" className="order-last flex w-full flex-wrap gap-1 lg:order-none lg:w-auto">
          {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href}
            aria-current={pathname === href ? "page" : undefined} className="monitor-nav-link">
            <Icon size={16} aria-hidden="true" />{label}
          </Link>)}
        </nav>
        <div className="flex min-w-0 items-center gap-3">
          <Link className="hidden max-w-36 truncate rounded text-sm text-slate-300 hover:text-white sm:block" href="/dashboard/settings" title={email}>{displayName}</Link>
          <form action={logout}><SignOutButton /></form>
        </div>
      </div>
    </header>
    <main id="main-content" className="mx-auto max-w-[1520px] space-y-5 px-4 py-5 sm:px-6 lg:py-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="w-full text-xs sm:w-64">Estación seleccionada
          <select value={selectedId} onChange={(event) => select(event.target.value)} disabled={!devices.length}>
            {!devices.length && <option value="">Sin dispositivos</option>}
            {devices.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </label>
        {role && <p className={overview ? "monitor-role" : "badge mb-2"}>{role}</p>}
      </div>
      {children}
      <footer className={overview ? "monitor-footer" : "border-t border-slate-200 pt-5 text-xs leading-5 muted"}>
        Hora de Bolivia (UTC−4) <span aria-hidden="true">·</span> <Link href="/privacy" className="underline">Privacidad</Link>
        <span aria-hidden="true"> · </span><Link href="/swagger" className="underline">API</Link>
      </footer>
    </main>
  </div>;
}
