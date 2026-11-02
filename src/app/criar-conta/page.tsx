import type { Metadata } from "next";
import { RegisterClient } from "@/components/auth/RegisterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function CriarContaPage() {
  return <RegisterClient />;
}
