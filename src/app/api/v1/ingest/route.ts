import { ingestionClient } from "@/lib/supabase/admin";
import { parseDeviceToken, payloadHash } from "@/lib/auth/device-token";
import { ingestSchema } from "@/lib/validation";
import { databaseError, readJson, route, success } from "@/lib/api/http";
import type { Json } from "@/types/domain";

export const runtime = "nodejs";
export const POST = route(async (request) => {
  const { deviceId, tokenHash } = parseDeviceToken(request);
  const payload = ingestSchema.parse(await readJson(request));
  const { data, error } = await ingestionClient().rpc("ingest_measurement", {
    p_device_id: deviceId, p_token_hash: tokenHash, p_payload: payload as Json, p_payload_hash: payloadHash(payload),
  });
  databaseError(error);
  const duplicate = data !== null && typeof data === "object" && !Array.isArray(data) && data.duplicate === true;
  return success(data, duplicate ? 200 : 201);
});
