import "server-only";
import { cache } from "react";
import { serverClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/http";
import { hasPublicConfig } from "@/lib/supabase/env";

export const requireSession = cache(async () => {
  if (!hasPublicConfig()) throw new ApiError(503, "NOT_CONFIGURED", "El acceso a cuentas todavía no está habilitado.");
  const supabase = await serverClient();
  let result: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try { result = await supabase.auth.getUser(); }
  catch { throw new ApiError(503, "AUTH_UNAVAILABLE", "No se pudo conectar con el servicio de acceso. Intenta nuevamente."); }
  const { data, error } = result;
  if (error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500)) {
    throw new ApiError(503, "AUTH_UNAVAILABLE", "El servicio de acceso no está disponible. Intenta nuevamente.");
  }
  if (error || !data.user) throw new ApiError(401, "UNAUTHENTICATED", "Tu sesión terminó. Inicia sesión para continuar.");
  return { supabase, user: data.user };
});
