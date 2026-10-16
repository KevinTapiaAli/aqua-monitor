import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import type { AuthSearchParams } from "@/lib/auth/form-state";
import { forgotPassword } from "../actions";
export default function Forgot({ searchParams }: { searchParams: AuthSearchParams }) {
  return <AuthForm title="Recupera tu acceso" description="Te enviaremos un enlace para elegir una nueva contraseña." action={forgotPassword} button="Enviar enlace" email searchParams={searchParams}>
    <p><Link href="/login" className="auth-link">Volver al inicio de sesión</Link></p>
  </AuthForm>;
}
