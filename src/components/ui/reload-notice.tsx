"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
export function ReloadNotice({ message }: { message: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div role="alert" className="message message-error flex flex-wrap items-center justify-between gap-3"><p>{message}</p><button className="btn btn-secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={16} className={pending ? "animate-spin" : ""} aria-hidden="true" />{pending ? "Cargando…" : "Reintentar"}</button></div>;
}
