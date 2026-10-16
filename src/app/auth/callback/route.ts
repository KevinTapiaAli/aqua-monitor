import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { hasPublicConfig } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = new URL(process.env.APP_URL || url.origin).origin;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") === "/reset-password" ? "/reset-password" : "/dashboard";
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  if (hasPublicConfig() && code && code.length <= 2048) {
    try {
      const supabase = await serverClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin), { headers });
    } catch { return NextResponse.redirect(new URL("/login?notice=unavailable", origin), { headers }); }
  }
  const fallback = next === "/reset-password" ? "/forgot-password" : "/verify-email";
  return NextResponse.redirect(new URL(fallback + "?notice=invalid_link", origin), { headers });
}
