import { requireSession } from "@/lib/auth/session";
import { profileSchema } from "@/lib/validation";
import { databaseError, readJson, requireSameOrigin, route, success } from "@/lib/api/http";

export const PUT = route(async (request) => {
  requireSameOrigin(request);
  const { supabase, user } = await requireSession();
  const input = profileSchema.parse(await readJson(request));
  const current = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  databaseError(current.error);
  const result = current.data
    ? await supabase.from("profiles").update(input).eq("id", user.id).select("*").single()
    : await supabase.from("profiles").insert({ ...input, id: user.id }).select("*").single();
  databaseError(result.error);
  return success(result.data);
});
