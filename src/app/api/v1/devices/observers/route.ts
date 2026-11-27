import { requireSession } from "@/lib/auth/session";
import { ApiError, databaseError, readJson, requireSameOrigin, route, success } from "@/lib/api/http";
import { observerSchema, uuidSchema } from "@/lib/validation";

async function requireStationAdmin(request: Request) {
  const deviceId = uuidSchema.parse(new URL(request.url).searchParams.get("device_id"));
  const { supabase, user } = await requireSession();
  // La propiedad se comprueba con la identidad de la sesión porque un observador también puede ver la estación.
  const { data, error } = await supabase.rpc("owns_device", { target: deviceId });
  databaseError(error);
  if (!data) throw new ApiError(403, "FORBIDDEN", "Solo el administrador de esta estación puede gestionar observadores.");
  return { supabase, user, deviceId };
}

export const GET = route(async (request) => {
  const { supabase, deviceId } = await requireStationAdmin(request);
  const { data, error } = await supabase.from("device_users").select("user_id")
    .eq("device_id", deviceId).eq("role", "viewer").order("created_at");
  databaseError(error);
  return success((data ?? []).map((row) => row.user_id));
});

export const POST = route(async (request) => {
  requireSameOrigin(request);
  const { supabase, user, deviceId } = await requireStationAdmin(request);
  const { user_id } = observerSchema.parse(await readJson(request));
  if (user_id.toLowerCase() === user.id.toLowerCase()) {
    throw new ApiError(422, "ALREADY_ADMIN", "Esta cuenta ya administra la estación.");
  }
  // Conceder acceso dos veces conserva la misma membresía y evita una actualización del rol.
  const { error } = await supabase.from("device_users").upsert({
    device_id: deviceId, user_id, role: "viewer",
  }, { onConflict: "device_id,user_id", ignoreDuplicates: true });
  if (error?.code === "23503") throw new ApiError(404, "ACCOUNT_NOT_FOUND", "No se encontró una cuenta con ese identificador.");
  databaseError(error);
  return success(user_id.toLowerCase());
});

export const DELETE = route(async (request) => {
  requireSameOrigin(request);
  const { supabase, deviceId } = await requireStationAdmin(request);
  const { user_id } = observerSchema.parse(await readJson(request));
  // Acotar la revocación a membresías de observador protege la asociación del propietario.
  const { error } = await supabase.from("device_users").delete()
    .eq("device_id", deviceId).eq("user_id", user_id).eq("role", "viewer");
  databaseError(error);
  return success(user_id);
});
