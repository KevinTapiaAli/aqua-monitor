import { requireSession } from "@/lib/auth/session";
import { ruleSchema, uuidSchema } from "@/lib/validation";
import { parameterInfo } from "@/config/parameters";
import { databaseError, readJson, requireSameOrigin, route, success } from "@/lib/api/http";

export const GET = route(async (request) => {
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).searchParams.get("device_id"));
  const { data, error } = await supabase.from("alert_rules").select("*").eq("device_id", id);
  databaseError(error);
  return success(data ?? []);
});
export const PUT = route(async (request) => {
  requireSameOrigin(request);
  const { supabase } = await requireSession();
  const input = ruleSchema.parse(await readJson(request));
  const existing = await supabase.from("alert_rules").select("id").eq("device_id", input.device_id).eq("parameter", input.parameter).maybeSingle();
  databaseError(existing.error);
  const values = { unit: parameterInfo[input.parameter].unit, min_value: input.min_value, max_value: input.max_value, enabled: input.enabled };
  const result = existing.data
    ? await supabase.from("alert_rules").update(values).eq("id", existing.data.id).select("*").single()
    : await supabase.from("alert_rules").insert({ ...input, ...values }).select("*").single();
  databaseError(result.error);
  return success(result.data);
});
