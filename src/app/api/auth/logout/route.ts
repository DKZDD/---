import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PRE_COOKIE, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PRE_COOKIE);
  return NextResponse.json({ ok: true });
}
