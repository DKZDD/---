import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos, type Video } from "@/db/schema";
import { getAdminForApi } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const EDITABLE = [
  "title",
  "description",
  "category",
  "videoUrl",
  "thumbUrl",
  "year",
  "durationSec",
  "rating",
  "source",
  "featured",
  "vipOnly",
] as const;

/** remove arquivos locais enviados por upload quando não são mais usados */
async function maybeDeleteLocalFile(url: string | null) {
  if (!url || !url.startsWith("/api/media")) return;
  let rel: string | null = null;
  try {
    rel = new URL(url, "http://localhost").searchParams.get("p");
  } catch {
    return;
  }
  if (!rel) return;
  const root = path.join(process.cwd(), "uploads");
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return;
  try {
    if (existsSync(full)) await unlink(full);
  } catch {
    /* melhor esforço */
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video)
    return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });
  return NextResponse.json(video);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminForApi(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const [existing] = await db.select().from(videos).where(eq(videos.id, id));
  if (!existing)
    return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });

  const patch: Partial<Pick<Video, (typeof EDITABLE)[number]>> = {};
  for (const key of EDITABLE) {
    if (!(key in body)) continue;
    const value = body[key];
    switch (key) {
      case "title":
        if (typeof value === "string" && value.trim()) patch.title = value.trim();
        break;
      case "description":
      case "category":
        if (typeof value === "string") patch[key] = value.trim();
        break;
      case "videoUrl":
        if (typeof value === "string" && value.trim())
          patch.videoUrl = value.trim();
        break;
      case "thumbUrl":
        patch.thumbUrl =
          typeof value === "string" && value.trim() ? value.trim() : null;
        break;
      case "year":
      case "durationSec":
        patch[key] =
          value === null || value === "" ? null : Math.max(0, Number(value) || 0);
        break;
      case "rating":
        if (typeof value === "string") patch.rating = value;
        break;
      case "source":
        if (value === "upload" || value === "url") patch.source = value;
        break;
      case "featured":
        patch.featured = Boolean(value);
        break;
      case "vipOnly":
        patch.vipOnly = Boolean(value);
        break;
    }
  }

  const [updated] = await db
    .update(videos)
    .set(patch)
    .where(eq(videos.id, id))
    .returning();

  // limpa arquivo antigo se o vídeo passou a apontar para outra fonte
  if (patch.videoUrl && patch.videoUrl !== existing.videoUrl) {
    void maybeDeleteLocalFile(existing.videoUrl);
  }
  if (patch.thumbUrl !== undefined && patch.thumbUrl !== existing.thumbUrl) {
    void maybeDeleteLocalFile(existing.thumbUrl);
  }

  publish({ type: "videos", action: "updated", id });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminForApi(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const [existing] = await db.select().from(videos).where(eq(videos.id, id));
  if (!existing)
    return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });

  await db.delete(videos).where(eq(videos.id, id));

  void maybeDeleteLocalFile(existing.videoUrl);
  void maybeDeleteLocalFile(existing.thumbUrl);

  publish({ type: "videos", action: "deleted", id });
  return NextResponse.json({ ok: true });
}
