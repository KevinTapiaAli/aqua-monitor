import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Aqua Monitor", template: "%s · Aqua Monitor" },
  description: "Sistema IoT multiparamétrico para el monitoreo de la calidad del agua.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
