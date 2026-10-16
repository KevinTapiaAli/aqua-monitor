"use client";
import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { browserClient } from "@/lib/supabase/browser";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";

function subscribeNetwork(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}
export function SessionGuard({ userId }: { userId: string }) {
  const online = useSyncExternalStore(subscribeNetwork, () => navigator.onLine, () => true);
  useEffect(() => {
    const supabase = browserClient();
    let redirecting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function leave(path = "/login?notice=expired") {
      if (redirecting) return;
      redirecting = true;
      // Recarga completa para retirar de memoria los datos de la cuenta anterior.
      timer = setTimeout(() => window.location.replace(path), 0);
    }
    const expired = () => leave();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") leave();
      else if (session && session.user.id !== userId) leave("/dashboard");
      else if (event === "PASSWORD_RECOVERY") leave("/reset-password");
    });
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => { data.subscription.unsubscribe(); window.removeEventListener(SESSION_EXPIRED_EVENT, expired); if (timer) clearTimeout(timer); };
  }, [userId]);
  return !online ? <p role="status" className="message flex items-center gap-3"><WifiOff size={19} className="shrink-0" aria-hidden="true" /> Sin conexión a Internet. Los datos visibles corresponden a la última actualización recibida.</p> : null;
}
