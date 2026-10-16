export type AuthField = "email" | "password" | "confirmPassword" | "displayName";
export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Partial<Record<AuthField, string[]>>;
  values?: { email?: string; displayName?: string };
};
export type AuthAction = (previous: AuthFormState, form: FormData) => Promise<AuthFormState>;
export type AuthSearchParams = Promise<{ notice?: string }>;
export const authNotices: Record<string, { message: string; error?: boolean }> = {
  expired: { message: "Tu sesión terminó. Inicia sesión para volver a tu espacio de trabajo." },
  updated: { message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." },
  invalid_link: { message: "El enlace ya no es válido. Solicita uno nuevo y ábrelo en el navegador donde lo pediste.", error: true },
  recovery_required: { message: "Solicita un enlace de recuperación para cambiar tu contraseña." },
  unavailable: { message: "El servicio de acceso no está disponible en este momento. Inténtalo nuevamente.", error: true },
};
