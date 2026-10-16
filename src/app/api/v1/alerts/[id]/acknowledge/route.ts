import { requireSession } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/validation";
import { databaseError, requireSameOrigin, route, success } from "@/lib/api/http";

export const POST = route(async (request) => {
  requireSameOrigin(request);
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).pathname.split("/").at(-2));
  const { error } = await supabase.rpc("acknowledge_alert", { p_alert_id: id });
  databaseError(error);
  return success({ acknowledged: true });
});
