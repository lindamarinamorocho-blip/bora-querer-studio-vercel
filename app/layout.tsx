import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bora Querer Studio | Painel de produção",
  description: "Agenda e painel privado de produção audiovisual de Linda Marina em Palmas–TO.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
