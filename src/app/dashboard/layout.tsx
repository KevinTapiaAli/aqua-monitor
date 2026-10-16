import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/http";
import { DeviceProvider } from "@/components/layout/device-provider";
import { AppShell } from "@/components/layout/app-shell";
import { SessionGuard } from "@/components/auth/session-guard";
import { ReloadNotice } from "@/components/ui/reload-notice";

export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession().catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) redirect("/login?notice=expired");
    if (error instanceof ApiError && error.code === "NOT_CONFIGURED") redirect("/login");
    throw error;
  });
  const { supabase, user } = session;
  const [deviceResult, profileResult] = await Promise.all([
    supabase.from("devices").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  return <DeviceProvider initialDevices={deviceResult.data ?? []} userId={user.id}>
    <AppShell email={user.email ?? "Usuario"} displayName={profileResult.data?.display_name || "Mi cuenta"}>
      <SessionGuard userId={user.id} />
      {deviceResult.error ? <ReloadNotice message="No se pudieron cargar tus estaciones. Inténtalo nuevamente en unos momentos." /> : children}
    </AppShell>
  </DeviceProvider>;
}
