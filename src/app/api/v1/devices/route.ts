import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/auth/session";
import { issueToken } from "@/lib/auth/device-token";
import { deviceSchema } from "@/lib/validation";
import { databaseError, readJson, requireSameOrigin, route, success } from "@/lib/api/http";

export const GET = route(async () => {
  const { supabase } = await requireSession();
  const { data, error } = await supabase.from("devices").select("*").order("created_at", { ascending: false }).limit(100);
  databaseError(error);
  return success(data ?? []);
});
export const POST = route(async (request) => {
  requireSameOrigin(request);
  const { supabase } = await requireSession();
  const input = deviceSchema.parse(await readJson(request));
  const id = randomUUID();
  const credential = issueToken(id);
  const { error } = await supabase.rpc("register_device", {
    p_device_id: id, p_name: input.name, p_location: input.location,
    p_interval: input.expected_interval_seconds, p_token_hash: credential.hash,
  });
  databaseError(error);
  return success({ id, token: credential.token }, 201);
});
