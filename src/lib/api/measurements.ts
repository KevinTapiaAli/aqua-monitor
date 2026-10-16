import "server-only";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { measurementQuerySchema } from "@/lib/validation";
import { ApiError, databaseError } from "./http";
import type { Measurement, PageResult } from "@/types/domain";

const cursorSchema = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() });
export async function listMeasurements(request: Request): Promise<PageResult<Measurement>> {
  const { supabase } = await requireSession();
  const input = measurementQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  let query = supabase.from("measurements").select("*").eq("device_id", input.device_id)
    .order("received_at", { ascending: false }).order("id", { ascending: false }).limit(input.limit + 1);
  if (input.from && input.to) query = query.gte("received_at", input.from).lt("received_at", input.to);
  if (input.cursor) {
    let decoded: z.infer<typeof cursorSchema>;
    try { decoded = cursorSchema.parse(JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8"))); }
    catch { throw new ApiError(422, "INVALID_CURSOR", "El cursor de paginación no es válido."); }
    // Ambos campos fueron validados; nunca se interpola texto libre en un filtro PostgREST.
    query = query.or(`received_at.lt.${decoded.at},and(received_at.eq.${decoded.at},id.lt.${decoded.id})`);
  }
  const { data, error } = await query;
  databaseError(error);
  const rows = data ?? [];
  const items = rows.slice(0, input.limit);
  const last = items.at(-1);
  return { items, limit: input.limit, next_cursor: rows.length > input.limit && last ? Buffer.from(JSON.stringify({ at: last.received_at, id: last.id })).toString("base64url") : null };
}
