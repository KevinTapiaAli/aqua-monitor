"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import type { AuthAction, AuthField, AuthFormState } from "@/lib/auth/form-state";

type Props = { action: AuthAction; button: string; password?: boolean; email?: boolean; newPassword?: boolean; name?: boolean; configured: boolean };
const initialState: AuthFormState = { status: "idle" };

export function AuthFields({ action, button, password, email, newPassword, name, configured }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "idle") return;
    const invalid = formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
    if (invalid) invalid.focus(); else noticeRef.current?.focus();
  }, [state]);
  function error(field: AuthField) {
    return state.errors?.[field] ? <span id={field + "-error"} className="text-xs font-normal text-rose-700">{state.errors[field]?.[0]}</span> : null;
  }
  return <div className="my-7">
    {!configured && <div role="status" className="message mb-6 flex gap-3"><LockKeyhole size={20} className="shrink-0" aria-hidden="true" /><p>El acceso a cuentas aún no está habilitado. Falta conectar la base de datos del proyecto.</p></div>}
    {state.message && <div ref={noticeRef} tabIndex={-1} role={state.status === "error" ? "alert" : "status"} className={`message mb-6 ${state.status === "error" ? "message-error" : ""}`}>
      {state.status === "success" && <CheckCircle2 size={20} className="mb-2" aria-hidden="true" />}{state.message}
    </div>}
    <form ref={formRef} action={formAction} aria-busy={pending}>
      <fieldset disabled={!configured || pending} className="space-y-5 disabled:opacity-65">
        {name && <label htmlFor="displayName">Tu nombre<input id="displayName" name="displayName" autoComplete="name" placeholder="¿Cómo te llamas?" required maxLength={100} defaultValue={state.values?.displayName} aria-invalid={Boolean(state.errors?.displayName)} aria-describedby={state.errors?.displayName ? "displayName-error" : undefined} />{error("displayName")}</label>}
        {email && <label htmlFor="email">Correo electrónico<input id="email" type="email" name="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="tu@universidad.edu" defaultValue={state.values?.email} aria-invalid={Boolean(state.errors?.email)} aria-describedby={state.errors?.email ? "email-error" : undefined} />{error("email")}</label>}
        {password && <div>
          <label htmlFor="password">{newPassword ? "Nueva contraseña" : "Contraseña"}</label>
          <div className="relative mt-2"><input id="password" type={visible ? "text" : "password"} name="password" autoComplete={newPassword ? "new-password" : "current-password"} required minLength={newPassword ? 10 : 1} maxLength={128} className="pr-14!" aria-invalid={Boolean(state.errors?.password)} aria-describedby={state.errors?.password ? "password-error password-help" : "password-help"} onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))} onBlur={() => setCapsLock(false)} />
            <button type="button" className="absolute inset-y-0 right-0 px-4 text-slate-500 hover:text-cyan-800" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
          </div>
          <p id="password-help" className="mt-2 text-xs muted">{newPassword ? "Mínimo 10 caracteres. Combina palabras, números y símbolos." : "Usa la contraseña de tu cuenta."}</p>
          {capsLock && <p role="status" className="mt-1 text-xs text-amber-800">El bloqueo de mayúsculas está activado.</p>}{error("password")}
        </div>}
        {newPassword && <label htmlFor="confirmPassword">Confirma tu contraseña<input id="confirmPassword" type={visible ? "text" : "password"} name="confirmPassword" autoComplete="new-password" required minLength={10} maxLength={128} aria-invalid={Boolean(state.errors?.confirmPassword)} aria-describedby={state.errors?.confirmPassword ? "confirmPassword-error" : undefined} />{error("confirmPassword")}</label>}
        <button className="btn w-full py-3!" type="submit">{pending ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Un momento…</> : <>{button}<ArrowRight size={17} aria-hidden="true" /></>}</button>
      </fieldset>
    </form>
  </div>;
}
