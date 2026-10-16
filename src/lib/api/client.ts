"use client";
export const SESSION_EXPIRED_EVENT = "aqua:session-expired";

type ErrorEnvelope = { error?: { message?: string; details?: { field: string; message: string }[] } };
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  const timeout = AbortSignal.timeout(20_000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch("/api/v1/" + path, { ...init, cache: "no-store", credentials: "same-origin", headers, signal });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    if (timeout.aborted) throw new Error("La solicitud tardó demasiado. Actualiza los datos antes de repetir una operación.");
    throw new Error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
  }
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  let result: ErrorEnvelope & { data?: T };
  try { result = await response.json(); }
  catch { throw new Error("El servicio devolvió una respuesta inesperada. Inténtalo nuevamente."); }
  if (!response.ok) {
    const details = Array.isArray(result.error?.details) ? result.error.details.map((value) => value.message).join(" ") : "";
    throw new Error(details || result.error?.message || "No se pudo completar la solicitud.");
  }
  return result.data as T;
}
