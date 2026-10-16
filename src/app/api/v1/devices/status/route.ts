import { requireSession } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/validation";
import { databaseError, route, success } from "@/lib/api/http";
import { deviceStatus } from "@/lib/utils/device-status";

export const GET = route(async (request) => {
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).searchParams.get("device_id"));
  const { data, error } = await supabase.from("devices").select("*").eq("id", id).maybeSingle();
  databaseError(error);
  return success(data ? { device_id: id, status: deviceStatus(data), last_received_at: data.last_received_at, expected_interval_seconds: data.expected_interval_seconds } : null);
});
