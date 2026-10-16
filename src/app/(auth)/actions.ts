"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { hasPublicConfig } from "@/lib/supabase/env";
import type { AuthField, AuthFormState } from "@/lib/auth/form-state";

const emailSchema = z.string().trim().max(254).pipe(z.email("Introduce un correo válido."));
const passwordSchema = z.string().min(10, "Usa al menos 10 caracteres.").max(128, "Usa como máximo 128 caracteres.");
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Introduce tu contraseña.").max(128) });
const resetFields = { password: passwordSchema, confirmPassword: z.string() };
const passwordsMatch = (value: { password: string; confirmPassword: string }) => value.password === value.confirmPassword;
const mismatch = { path: ["confirmPassword"], message: "Las contraseñas no coinciden." };
const resetSchema = z.object(resetFields).refine(passwordsMatch, mismatch);
const registrationSchema = z.object({
  ...resetFields, email: emailSchema,
  displayName: z.string().trim().min(1, "Introduce tu nombre.").max(100, "Usa como máximo 100 caracteres."),
}).refine(passwordsMatch, mismatch);

function values(form: FormData) {
  return { email: String(form.get("email") ?? "").trim().slice(0, 254), displayName: String(form.get("displayName") ?? "").trim().slice(0, 100) };
}
function failure(message: string, form: FormData, error?: z.ZodError): AuthFormState {
  const errors: Partial<Record<AuthField, string[]>> = {};
  for (const issue of error?.issues ?? []) {
    const field = issue.path[0] as AuthField;
    if (["email", "password", "confirmPassword", "displayName"].includes(field)) (errors[field] ??= []).push(issue.message);
  }
  return { status: "error", message, values: values(form), errors };
}
function authError(error: { code?: string; status?: number }): string {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return "Has realizado varios intentos. Espera unos minutos antes de volver a intentarlo.";
  if (error.code === "email_not_confirmed") return "Confirma tu correo antes de ingresar. Puedes solicitar un nuevo enlace de activación.";
  if (error.code === "invalid_credentials") return "El correo o la contraseña no son correctos.";
  if (error.code === "weak_password") return "Elige una contraseña más segura, con letras, números y símbolos.";
  if (error.code === "same_password") return "Elige una contraseña diferente de la anterior.";
  return "No se pudo completar la solicitud. Revisa tus datos o inténtalo más tarde.";
}
function origin() {
  const configured = process.env.APP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  if (!configured) throw new Error("Missing application origin");
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid application origin");
  return url.origin;
}
function unavailable(form: FormData) {
  return failure("El acceso a cuentas estará disponible cuando se conecte la base de datos del proyecto.", form);
}

export async function login(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!hasPublicConfig()) return unavailable(form);
  const input = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!input.success) return failure("Revisa los campos indicados.", form, input.error);
  try {
    const supabase = await serverClient();
    const { error } = await supabase.auth.signInWithPassword(input.data);
    if (error) return failure(authError(error), form);
  } catch { return failure("No pudimos conectar con el servicio de acceso. Inténtalo nuevamente.", form); }
  redirect("/dashboard");
}
export async function register(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!hasPublicConfig()) return unavailable(form);
  const input = registrationSchema.safeParse({ email: form.get("email"), displayName: form.get("displayName"), password: form.get("password"), confirmPassword: form.get("confirmPassword") });
  if (!input.success) return failure("Revisa los campos indicados.", form, input.error);
  let signedIn = false;
  try {
    const supabase = await serverClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.data.email, password: input.data.password,
      options: { data: { display_name: input.data.displayName }, emailRedirectTo: origin() + "/auth/callback?next=/dashboard" },
    });
    if (error) return failure(authError(error), form);
    signedIn = Boolean(data.session);
  } catch { return failure("No pudimos completar el registro. Inténtalo nuevamente.", form); }
  if (signedIn) redirect("/dashboard");
  return { status: "success", values: values(form), message: "Revisa tu correo y abre el enlace de activación en este navegador. Si ya tenías una cuenta, puedes iniciar sesión o recuperar tu contraseña." };
}
export async function logout(): Promise<void> {
  if (!hasPublicConfig()) redirect("/login");
  let failed = false;
  try {
    const supabase = await serverClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch { failed = true; }
  redirect(failed ? "/login?notice=unavailable" : "/login");
}
export async function forgotPassword(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!hasPublicConfig()) return unavailable(form);
  const input = z.object({ email: emailSchema }).safeParse({ email: form.get("email") });
  if (!input.success) return failure("Revisa tu correo electrónico.", form, input.error);
  try {
    const supabase = await serverClient();
    const { error } = await supabase.auth.resetPasswordForEmail(input.data.email, { redirectTo: origin() + "/auth/callback?next=/reset-password" });
    if (error) return failure(authError(error), form);
  } catch { return failure("No pudimos enviar el enlace. Inténtalo nuevamente.", form); }
  return { status: "success", values: values(form), message: "Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también la carpeta de correo no deseado." };
}
export async function resendConfirmation(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!hasPublicConfig()) return unavailable(form);
  const input = z.object({ email: emailSchema }).safeParse({ email: form.get("email") });
  if (!input.success) return failure("Revisa tu correo electrónico.", form, input.error);
  try {
    const supabase = await serverClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: input.data.email, options: { emailRedirectTo: origin() + "/auth/callback?next=/dashboard" } });
    if (error) return failure(authError(error), form);
  } catch { return failure("No pudimos enviar el enlace. Inténtalo nuevamente.", form); }
  return { status: "success", values: values(form), message: "Si tu cuenta necesita confirmación, recibirás un nuevo enlace de activación. Revisa tu bandeja de entrada y el correo no deseado." };
}
export async function resetPassword(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!hasPublicConfig()) return unavailable(form);
  const input = resetSchema.safeParse({ password: form.get("password"), confirmPassword: form.get("confirmPassword") });
  if (!input.success) return failure("Revisa los campos indicados.", form, input.error);
  try {
    const supabase = await serverClient();
    const { data, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !data.user) return failure("El enlace de recuperación expiró. Solicita uno nuevo.", form);
    const { error } = await supabase.auth.updateUser({ password: input.data.password });
    if (error) return failure(authError(error), form);
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) return { status: "success", message: "Tu contraseña se actualizó. No se pudieron cerrar las sesiones existentes; vuelve a cerrar sesión desde tu cuenta." };
  } catch { return failure("No se pudo completar la solicitud. Si la contraseña ya cambió, úsala para iniciar sesión.", form); }
  redirect("/login?notice=updated");
}
