import { requireSession } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/validation";
import { databaseError, route, success } from "@/lib/api/http";

export const GET = route(async (request) => {
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).searchParams.get("device_id"));
  const { data, error } = await supabase.from("alerts").select("*").eq("device_id", id).is("acknowledged_at", null).order("created_at", { ascending: false }).limit(50);
  databaseError(error);
  return success(data ?? []);
});
