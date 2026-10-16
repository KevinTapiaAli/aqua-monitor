import { requireSession } from "@/lib/auth/session";
import { deviceUpdateSchema, uuidSchema } from "@/lib/validation";
import { ApiError, databaseError, readJson, requireSameOrigin, route, success } from "@/lib/api/http";

export const PATCH = route(async (request) => {
  requireSameOrigin(request);
  const { supabase, user } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).pathname.split("/").at(-1));
  const input = deviceUpdateSchema.parse(await readJson(request));
  const { data, error } = await supabase.from("devices").update(input).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, "NOT_FOUND", "Dispositivo no disponible para editar.");
  return success(data);
});
