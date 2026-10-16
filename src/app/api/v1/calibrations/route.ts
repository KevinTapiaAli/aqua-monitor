import { requireSession } from "@/lib/auth/session";
import { calibrationSchema, uuidSchema } from "@/lib/validation";
import { databaseError, readJson, requireSameOrigin, route, success } from "@/lib/api/http";

export const GET = route(async (request) => {
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).searchParams.get("device_id"));
  const { data, error } = await supabase.from("calibrations").select("*").eq("device_id", id).order("performed_at", { ascending: false }).limit(100);
  databaseError(error);
  return success(data ?? []);
});
export const POST = route(async (request) => {
  requireSameOrigin(request);
  const { supabase, user } = await requireSession();
  const input = calibrationSchema.parse(await readJson(request));
  const { data, error } = await supabase.from("calibrations").insert({ ...input, created_by: user.id }).select("*").single();
  databaseError(error);
  return success(data, 201);
});
