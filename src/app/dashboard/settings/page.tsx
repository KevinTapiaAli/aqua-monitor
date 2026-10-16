import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/http";
import { SettingsView } from "@/components/settings/settings-view";
export default async function SettingsPage() {
  const { supabase, user } = await requireSession().catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) redirect("/login?notice=expired");
    if (error instanceof ApiError && error.code === "NOT_CONFIGURED") redirect("/login");
    throw error;
  });
  const { data, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  if (error) throw new Error("No se pudo cargar el perfil.");
  return <SettingsView displayName={data?.display_name ?? ""} />;
}
