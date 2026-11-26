import { requireSession } from "@/lib/auth/session";
import { ApiError, databaseError, readJson, requireSameOrigin, route, success } from "@/lib/api/http";
import { privacyDetailsColumns } from "@/lib/privacy";
import { privacyDetailsSchema } from "@/lib/validation";

export const PUT = route(async (request) => {
  requireSameOrigin(request);
  const { supabase, user } = await requireSession();
  if (user.app_metadata.aqua_privacy_admin !== true) {
    throw new ApiError(403, "FORBIDDEN", "Solo el administrador de privacidad puede guardar estos datos.");
  }
  const input = privacyDetailsSchema.parse(await readJson(request));
  const { data, error } = await supabase.from("privacy_details").update(input).eq("id", true)
    .select(privacyDetailsColumns).maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(403, "FORBIDDEN", "No se pudo guardar con el permiso de esta sesión.");
  return success(data);
});
