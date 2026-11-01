import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { SupportWidget } from "@/components/SupportWidget";
import { UserProvider } from "@/components/UserContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

export const metadata: Metadata = {
  title: {
    default: "DuckeFlix — Seu cinema em casa",
    template: "%s · DuckeFlix",
  },
  description:
    "DuckeFlix: assista filmes, animações e vídeos em um catálogo cinematográfico. Adicione seus próprios vídeos por link ou upload.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${anton.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-zinc-100 antialiased">
        <UserProvider>
          {children}
          <SupportWidget />
        </UserProvider>
        <Toaster
          theme="dark"
          richColors
          closeButton
          position="bottom-right"
          toastOptions={{
            style: { background: "#131318", border: "1px solid #26262e" },
          }}
        />
      </body>
    </html>
  );
}
