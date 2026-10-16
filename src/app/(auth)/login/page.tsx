import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import type { AuthSearchParams } from "@/lib/auth/form-state";
import { login } from "../actions";
export default function Login({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthForm title="Bienvenido de nuevo" description="Accede a tus estaciones y sigue cada medición." action={login} button="Iniciar sesión" email password searchParams={searchParams}>
    <p><Link href="/forgot-password" className="auth-link">¿Olvidaste tu contraseña?</Link></p>
    <p>¿Primera vez aquí? <Link href="/register" className="auth-link">Crea tu cuenta</Link></p>
    <p><Link href="/verify-email" className="auth-link">Reenviar correo de activación</Link></p>
  </AuthForm>;
}
