import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/http";
import { readPrivacyDetails } from "@/lib/privacy";
import { PrivacyEditor } from "@/components/settings/privacy-editor";
import { SettingsView } from "@/components/settings/settings-view";
import { ReloadNotice } from "@/components/ui/reload-notice";
export default async function SettingsPage() {
  const { supabase, user } = await requireSession().catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) redirect("/login?notice=expired");
    if (error instanceof ApiError && error.code === "NOT_CONFIGURED") redirect("/login");
    throw error;
  });
  const canManagePrivacy = user.app_metadata.aqua_privacy_admin === true;
  const [{ data, error }, privacyDetails] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    canManagePrivacy ? readPrivacyDetails() : null,
  ]);
  if (error) throw new Error("No se pudo cargar el perfil.");
  return <SettingsView displayName={data?.display_name ?? ""} privacyPanel={canManagePrivacy && (
    privacyDetails ? <PrivacyEditor details={privacyDetails} /> :
      <ReloadNotice message="No se pudo cargar la configuración de privacidad. Comprueba la migración del proyecto y vuelve a intentarlo." />
  )} />;
}
