import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { VipMarketplace } from "@/components/VipMarketplace";

export const metadata: Metadata = { title: "Assinaturas DuckeFlix" };

export default function VipPage() {
  return (
    <>
      <Navbar />
      <VipMarketplace />
      <Footer />
    </>
  );
}
