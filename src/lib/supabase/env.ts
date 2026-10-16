export function hasPublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.startsWith("sb_secret_")) return false;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) && Boolean(parsed.hostname) &&
      (key.startsWith("sb_publishable_") || key.startsWith("eyJ"));
  } catch { return false; }
}
export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!hasPublicConfig() || !url || !key) throw new Error("Falta configurar el acceso público a Supabase.");
  return { url, key };
}
