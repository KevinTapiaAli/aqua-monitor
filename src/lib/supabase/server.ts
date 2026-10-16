import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { publicConfig } from "./env";

export async function serverClient() {
  const jar = await cookies();
  const { url, key } = publicConfig();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Los Server Components no escriben cookies; proxy.ts las renueva. */ }
      },
    },
  });
}
