import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos, type Video } from "@/db/schema";

export async function getAllVideos(): Promise<Video[]> {
  return db.select().from(videos).orderBy(desc(videos.createdAt));
}

export async function getFeatured(): Promise<Video | null> {
  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.featured, true))
    .orderBy(desc(videos.createdAt))
    .limit(1);
  if (rows[0]) return rows[0];
  const latest = await db
    .select()
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(1);
  return latest[0] ?? null;
}

export async function getTopByViews(limit = 10): Promise<Video[]> {
  return db.select().from(videos).orderBy(desc(videos.views)).limit(limit);
}

export async function getByCategory(
  category: string,
  limit = 20,
): Promise<Video[]> {
  return db
    .select()
    .from(videos)
    .where(eq(videos.category, category))
    .orderBy(desc(videos.createdAt))
    .limit(limit);
}

export async function getVideoById(id: number): Promise<Video | null> {
  const rows = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getRelated(
  category: string,
  excludeId: number,
  limit = 12,
): Promise<Video[]> {
  const sameCat = await db
    .select()
    .from(videos)
    .where(and(eq(videos.category, category), ne(videos.id, excludeId)))
    .orderBy(desc(videos.views))
    .limit(limit);

  if (sameCat.length >= limit) return sameCat;

  const others = await db
    .select()
    .from(videos)
    .where(ne(videos.id, excludeId))
    .orderBy(desc(videos.views))
    .limit(limit);

  const seen = new Set(sameCat.map((v) => v.id));
  return [...sameCat, ...others.filter((v) => !seen.has(v.id))].slice(0, limit);
}

export async function searchVideos(q: string): Promise<Video[]> {
  const like = `%${q}%`;
  return db
    .select()
    .from(videos)
    .where(
      or(
        ilike(videos.title, like),
        ilike(videos.description, like),
        ilike(videos.category, like),
      ),
    )
    .orderBy(desc(videos.views))
    .limit(60);
}

export async function countVideos() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videos);
  return rows[0]?.count ?? 0;
}
