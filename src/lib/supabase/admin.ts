import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicConfig } from "./env";

// Solo la ingesta usa este cliente. La identidad se verifica dentro de la RPC.
export function ingestionClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta configurar la credencial de ingesta del servidor.");
  return createClient<Database>(publicConfig().url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
