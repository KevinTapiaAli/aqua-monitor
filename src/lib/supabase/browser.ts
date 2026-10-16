"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { publicConfig } from "./env";

export function browserClient() {
  const { url, key } = publicConfig();
  return createBrowserClient<Database>(url, key);
}
