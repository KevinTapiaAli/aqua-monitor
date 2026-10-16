import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status, headers: { "Cache-Control": "private, no-store" } });
}
export function route(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Revisa los campos enviados.", details: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) } }, { status: 422, headers: { "Cache-Control": "no-store" } });
      }
      const known = error instanceof ApiError;
      // Nunca imprimir Request, tokens, payload completo o errores del proveedor.
      const status = known ? error.status : 500;
      return NextResponse.json({ error: { code: known ? error.code : "INTERNAL_ERROR", message: known ? error.message : "No se pudo completar la operación. Intenta nuevamente." } }, {
        status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "2" } : {}) },
      });
    }
  };
}
export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ApiError(415, "CONTENT_TYPE", "Usa application/json.");
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ApiError(413, "BODY_TOO_LARGE", "El cuerpo supera el límite permitido.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_JSON", "Falta el cuerpo JSON.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ApiError(413, "BODY_TOO_LARGE", "El cuerpo supera el límite permitido."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => { body.set(chunk, offset); offset += chunk.length; });
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)); }
  catch { throw new ApiError(400, "INVALID_JSON", "El JSON no es válido."); }
}
export function requireSameOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (!configured) throw new ApiError(503, "NOT_CONFIGURED", "Falta configurar la URL de la aplicación.");
  if (request.headers.get("origin") !== new URL(configured).origin) throw new ApiError(403, "INVALID_ORIGIN", "Origen no permitido.");
}
export function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "28000") throw new ApiError(401, "INVALID_DEVICE", "Credencial de dispositivo inválida.");
  if (error.code === "42501") throw new ApiError(403, "FORBIDDEN", "No tienes permisos o el dispositivo está deshabilitado.");
  if (error.message === "rate_limited") throw new ApiError(429, "RATE_LIMITED", "Espera antes de enviar otra lectura.");
  if (error.message === "reading_conflict") throw new ApiError(409, "READING_CONFLICT", "reading_id ya existe con otro contenido.");
  if (error.message === "sensor_range") throw new ApiError(422, "SENSOR_RANGE", "Un valor está fuera de la especificación configurada del sensor.");
  if (error.code === "P0002" || error.code === "PGRST116") throw new ApiError(404, "NOT_FOUND", "El registro no está disponible.");
  if (error.code === "23505") throw new ApiError(409, "CONFLICT", "El registro ya existe.");
  if (error.code?.startsWith("22") || error.code === "23514") throw new ApiError(422, "INVALID_DATA", "Los datos no cumplen el contrato de almacenamiento.");
  throw new ApiError(503, "DATABASE_UNAVAILABLE", "No se pudo acceder a los datos. Intenta nuevamente.");
}
