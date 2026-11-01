import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** 596 -> "9min 56s" | 5400 -> "1h 30min" */
export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return s > 0 ? `${m}min ${String(s).padStart(2, "0")}s` : `${m}min`;
  return `${s}s`;
}

/** 65 -> "1:05" usado no player */
export function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)} mi`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)} mil`;
  return String(views);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/** URLs que podemos reproduzir diretamente num <video> (mp4/webm/etc ou nosso /api/media) */
export function isDirectVideo(url: string): boolean {
  if (url.startsWith("/api/media")) return true;
  return /\.(mp4|webm|m4v|mov|mkv|ogv|ts|m3u8)(\?.*)?$/i.test(url);
}
