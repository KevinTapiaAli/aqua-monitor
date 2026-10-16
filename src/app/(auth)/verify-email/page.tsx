import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import type { AuthSearchParams } from "@/lib/auth/form-state";
import { resendConfirmation } from "../actions";
export default function VerifyEmail({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthForm title="Confirma tu correo" description="Introduce el correo de tu cuenta para recibir un nuevo enlace de activación." action={resendConfirmation} button="Reenviar activación" email searchParams={searchParams}>
    <p><Link href="/login" className="auth-link">Ya confirmé mi correo. Iniciar sesión</Link></p>
    <p><Link href="/register" className="auth-link">Crear una cuenta</Link></p>
  </AuthForm>;
}
