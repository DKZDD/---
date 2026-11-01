import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  ogv: "video/ogg",
  avi: "video/x-msvideo",
  ts: "video/mp2t",
  m3u8: "application/vnd.apple.mpegurl",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function getMime(file: string) {
  const ext = file.toLowerCase().split(".").pop() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * Serve os arquivos enviados por upload (pasta /uploads) com suporte a
 * requisições Range — essencial para o seek do player de vídeo funcionar.
 * Uso: GET /api/media?p=videos/arquivo.mp4
 */
export async function GET(request: Request) {
  const rel = new URL(request.url).searchParams.get("p") ?? "";
  const segments = rel.split("/").filter(Boolean);

  const root = path.join(process.cwd(), "uploads");
  const absPath = path.normalize(path.join(root, ...segments));

  // proteção contra path traversal
  if (
    segments.length === 0 ||
    (!absPath.startsWith(root + path.sep) && absPath !== root)
  ) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }
  if (!existsSync(absPath)) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const { size } = await stat(absPath);
  const mime = getMime(absPath);
  const range = request.headers.get("range");

  const baseHeaders = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match?.[1] ? parseInt(match[1], 10) : NaN;
    let end = match?.[2] ? parseInt(match[2], 10) : NaN;

    if (Number.isNaN(start) && !Number.isNaN(end)) {
      // Range: bytes=-N (últimos N bytes)
      start = Math.max(0, size - end);
      end = size - 1;
    }
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end >= size) end = size - 1;
    if (start >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const stream = createReadStream(absPath, { start, end });
    const web = Readable.toWeb(stream) as ReadableStream;
    return new NextResponse(web, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = createReadStream(absPath);
  const web = Readable.toWeb(stream) as ReadableStream;
  return new NextResponse(web, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}
