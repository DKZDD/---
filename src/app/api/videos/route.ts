import { NextResponse } from "next/server";
import { db } from "@/db";
import { videos, type NewVideo } from "@/db/schema";
import { getAdminForApi } from "@/lib/auth";
import { publish } from "@/lib/events";
import { getAllVideos } from "@/lib/data";

export const dynamic = "force-dynamic";

const ALLOWED_RATINGS = ["L", "10", "12", "14", "16", "18"];

function sanitize(body: Record<string, unknown>): {
  data?: NewVideo;
  error?: string;
} {
  const title = String(body.title ?? "").trim();
  const videoUrl = String(body.videoUrl ?? "").trim();

  if (!title) return { error: "O título é obrigatório." };
  if (!videoUrl) return { error: "Informe a URL do vídeo ou envie um arquivo." };
  if (title.length > 200) return { error: "Título muito longo (máx. 200)." };

  const rating = String(body.rating ?? "L").trim();
  const year = body.year === null || body.year === undefined || body.year === ""
    ? null
    : Number(body.year);
  const durationSec =
    body.durationSec === null ||
    body.durationSec === undefined ||
    body.durationSec === ""
      ? null
      : Number(body.durationSec);

  if (year !== null && (!Number.isInteger(year) || year < 1888 || year > 2100)) {
    return { error: "Ano inválido." };
  }
  if (durationSec !== null && (!Number.isFinite(durationSec) || durationSec < 0)) {
    return { error: "Duração inválida." };
  }

  return {
    data: {
      title,
      description: String(body.description ?? "").trim(),
      category: String(body.category ?? "").trim() || "Geral",
      videoUrl,
      thumbUrl: String(body.thumbUrl ?? "").trim() || null,
      year,
      durationSec,
      rating: ALLOWED_RATINGS.includes(rating) ? rating : "L",
      source: body.source === "upload" ? "upload" : "url",
      featured: Boolean(body.featured),
      vipOnly: Boolean(body.vipOnly),
    },
  };
}

export async function GET() {
  const list = await getAllVideos();
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  if (!(await getAdminForApi(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, error } = sanitize(body);
  if (error || !data) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const [created] = await db.insert(videos).values(data).returning();
  publish({ type: "videos", action: "created", id: created.id });
  return NextResponse.json(created, { status: 201 });
}
