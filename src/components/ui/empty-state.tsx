import { Waves } from "lucide-react";
export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="panel py-14 text-center"><Waves className="mx-auto mb-5 size-9 text-cyan-600" aria-hidden="true" /><h2 className="text-lg font-semibold">{title}</h2><div className="mx-auto mt-3 max-w-lg text-sm leading-6 muted">{children}</div></div>;
}
