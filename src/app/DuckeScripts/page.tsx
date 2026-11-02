import type { Metadata } from "next";
import { AdminClient } from "@/components/admin/AdminClient";
import { AdminGate } from "@/components/admin/AdminGate";
import { getUserById, readSessionToken, toSafeUser } from "@/lib/auth";
import { getAllVideos } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Área restrita",
  robots: { index: false, follow: false },
};

export default async function DuckeScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ sessao?: string }>;
}) {
  /**
   * Handoff pela URL: logo após o 2FA o cliente chega com ?sessao=<jwt>.
   * O servidor valida e entrega o painel renderizado — funciona mesmo com
   * cookies/localStorage bloqueados (iframes, Safari, Brave).
   */
  const { sessao } = await searchParams;
  if (typeof sessao === "string" && sessao.length > 0) {
    const id = await readSessionToken(sessao);
    const user = id ? await getUserById(id) : null;
    if (user && user.status === "active") {
      const safe = await toSafeUser(user);
      if (safe.permissions.accessPanel) {
        const videos = await getAllVideos();
        return (
          <AdminClient
            initialVideos={videos}
            admin={safe}
            authToken={sessao}
          />
        );
      }
    }
  }

  // Caminho normal: o portão valida a sessão salva no navegador.
  return <AdminGate />;
}
