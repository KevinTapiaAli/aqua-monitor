"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn w-full" disabled={pending}>{pending ? "Procesando…" : children}</button>;
}
