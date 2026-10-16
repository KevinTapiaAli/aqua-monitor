import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import type { AuthSearchParams } from "@/lib/auth/form-state";
import { register } from "../actions";
export default function Register({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthForm title="Crea tu cuenta" description="Un espacio para tus estaciones, tus mediciones y tu equipo." action={register} button="Crear cuenta" name email password newPassword searchParams={searchParams}>
    <p>¿Ya tienes una cuenta? <Link href="/login" className="auth-link">Inicia sesión</Link></p>
    <p><Link href="/verify-email" className="auth-link">No recibí el correo de activación</Link></p>
  </AuthForm>;
}
