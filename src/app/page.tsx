import { CatalogLive } from "@/components/CatalogLive";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getAllVideos } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const videos = await getAllVideos();

  return (
    <>
      <Navbar />
      <CatalogLive initialVideos={videos} />
      <Footer />
    </>
  );
}
