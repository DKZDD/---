import type { Metadata } from "next";
import { LoginClient } from "@/components/auth/LoginClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acesso restrito",
  robots: { index: false, follow: false },
};

/**
 * Login exclusivo de administradores (exige 2FA).
 * Não existe mais rota pública de criação de admin: novas contas de
 * administrador só nascem dentro do painel, por um admin autenticado.
 */
export default function AdminLoginPage() {
  return <LoginClient mode="admin" />;
}
