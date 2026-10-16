import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { hasPublicConfig } from "@/lib/supabase/env";
import { serverClient } from "@/lib/supabase/server";
import type { AuthSearchParams } from "@/lib/auth/form-state";
import { resetPassword } from "../actions";
export default async function Reset({ searchParams }: { searchParams: AuthSearchParams }) {
  if (hasPublicConfig()) {
    let validSession = false;
    try {
      const supabase = await serverClient();
      const { data, error } = await supabase.auth.getUser();
      validSession = Boolean(data.user && !error);
    } catch { /* La acción vuelve a verificar la identidad antes de cambiar la contraseña. */ }
    if (!validSession) redirect("/forgot-password?notice=recovery_required");
  }
  return <AuthForm title="Nueva contraseña" description="Elige una contraseña única para proteger tus estaciones." action={resetPassword} button="Guardar contraseña" password newPassword searchParams={searchParams}>
    <p><Link href="/forgot-password" className="auth-link">Solicitar otro enlace de recuperación</Link></p>
    <p><Link href="/login" className="auth-link">Volver al inicio de sesión</Link></p>
  </AuthForm>;
}
