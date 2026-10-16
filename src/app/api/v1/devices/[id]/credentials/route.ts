import { requireSession } from "@/lib/auth/session";
import { issueToken } from "@/lib/auth/device-token";
import { uuidSchema } from "@/lib/validation";
import { databaseError, requireSameOrigin, route, success } from "@/lib/api/http";

export const POST = route(async (request) => {
  requireSameOrigin(request);
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).pathname.split("/").at(-2));
  const credential = issueToken(id);
  const { error } = await supabase.rpc("rotate_device_credential", { p_device_id: id, p_token_hash: credential.hash });
  databaseError(error);
  return success({ token: credential.token });
});
export const DELETE = route(async (request) => {
  requireSameOrigin(request);
  const { supabase } = await requireSession();
  const id = uuidSchema.parse(new URL(request.url).pathname.split("/").at(-2));
  const { error } = await supabase.rpc("rotate_device_credential", { p_device_id: id, p_token_hash: null });
  databaseError(error);
  return success({ revoked: true });
});
