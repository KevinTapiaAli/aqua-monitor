import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import { uuidSchema } from "@/lib/validation";

export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function issueToken(deviceId: string) {
  const token = `aq_${deviceId}.${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token) };
}
export function parseDeviceToken(request: Request) {
  const match = /^Bearer (aq_([0-9a-f-]{36})\.[A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  if (!match || !uuidSchema.safeParse(match[2]).success) throw new ApiError(401, "INVALID_DEVICE", "Credencial de dispositivo inválida.");
  return { deviceId: match[2], tokenHash: hashToken(match[1]) };
}
export function payloadHash(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, canonical(val)]));
    return item;
  };
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
