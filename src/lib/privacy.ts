import "server-only";
import { hasPublicConfig } from "@/lib/supabase/env";
import { serverClient } from "@/lib/supabase/server";
import type { PrivacyDetails } from "@/types/domain";

export const privacyDetailsColumns = "responsible_name, contact_email, retention_months";
export const examplePrivacyDetails: PrivacyDetails = {
  responsible_name: "Equipo Aqua Monitor (ejemplo)",
  contact_email: null,
  retention_months: null,
};

export async function readPrivacyDetails(): Promise<PrivacyDetails | null> {
  if (!hasPublicConfig()) return null;
  const supabase = await serverClient();
  const { data, error } = await supabase.from("privacy_details").select(privacyDetailsColumns).eq("id", true).maybeSingle();
  return error ? null : data;
}
