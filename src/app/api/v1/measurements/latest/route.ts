import { requireSession } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/validation";
import { databaseError, route, success } from "@/lib/api/http";

export const GET = route(async (request) => {
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).searchParams.get("device_id"));
  const { data, error } = await supabase.from("measurements").select("*").eq("device_id", id)
    .order("received_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
  databaseError(error);
  return success(data);
});
