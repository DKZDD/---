import { mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { getAdminForApi } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIDEO_EXTS = new Set(["mp4", "webm", "m4v", "mov", "mkv", "ogv", "ts", "m3u8", "avi"]);
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const MAX_SIZE = 4 * 1024 * 1024 * 1024; // 4 GB

function getExt(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export async function POST(request: Request) {
  if (!(await getAdminForApi(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Envie o arquivo como multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const kind = form.get("kind") === "thumb" ? "thumb" : "video";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nenhum arquivo recebido." },
      { status: 400 },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máx. 4 GB)." },
      { status: 413 },
    );
  }

  const ext = getExt(file.name);
  const allowed = kind === "thumb" ? IMAGE_EXTS : VIDEO_EXTS;
  if (!allowed.has(ext)) {
    return NextResponse.json(
      {
        error:
          kind === "thumb"
            ? "Formato de imagem não suportado (use jpg, png, webp...)."
            : "Formato de vídeo não suportado (use mp4, webm, mkv...).",
      },
      { status: 415 },
    );
  }

  const dir = kind === "thumb" ? "thumbs" : "videos";
  const safeBase =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "arquivo";

  const fileName = `${Date.now()}-${safeBase}.${ext}`;
  const absDir = path.join(process.cwd(), "uploads", dir);
  const absPath = path.join(absDir, fileName);
  await mkdir(absDir, { recursive: true });

  // grava em streaming para suportar arquivos grandes
  const webStream = file.stream();
  const nodeStream = Readable.fromWeb(
    webStream as unknown as import("node:stream/web").ReadableStream,
  );
  await pipeline(nodeStream, createWriteStream(absPath));

  const done = await stat(absPath);

  return NextResponse.json(
    {
      url: `/api/media?p=${dir}/${fileName}`,
      name: file.name,
      size: done.size,
      mime: file.type,
      kind,
    },
    { status: 201 },
  );
}
