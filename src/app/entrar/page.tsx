import type { Metadata } from "next";
import { LoginClient } from "@/components/auth/LoginClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function EntrarPage() {
  return <LoginClient mode="user" />;
}
