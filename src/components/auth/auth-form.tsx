import { AuthFields } from "./auth-fields";
import { hasPublicConfig } from "@/lib/supabase/env";
import { authNotices, type AuthAction, type AuthSearchParams } from "@/lib/auth/form-state";

type Props = {
  title: string; description: string; action: AuthAction;
  button: string; password?: boolean; email?: boolean; newPassword?: boolean; name?: boolean;
  searchParams: AuthSearchParams; children?: React.ReactNode;
};
export async function AuthForm({ title, description, searchParams, children, ...fields }: Props) {
  const { notice } = await searchParams;
  const feedback = notice && Object.hasOwn(authNotices, notice) ? authNotices[notice] : undefined;
  return <>
    <p className="eyebrow text-cyan-700">Tu espacio de monitoreo</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
    <p className="mt-3 text-sm leading-6 muted">{description}</p>
    {feedback && <p role={feedback.error ? "alert" : "status"} className={`message mt-5 ${feedback.error ? "message-error" : ""}`}>{feedback.message}</p>}
    <AuthFields {...fields} configured={hasPublicConfig()} />
    <div className="space-y-4 border-t border-slate-200 pt-6 text-sm muted">{children}</div>
  </>;
}
