import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { generateSecret, generateURI, verifySync } from "otplib";
import { db } from "@/db";
import {
  NO_PERMISSIONS,
  roles,
  subscriptionPlans,
  users,
  type Permissions,
  type Role,
  type SafeUser,
  type SubscriptionPlan,
  type User,
} from "@/db/schema";

/* ---------------------------- TOTP (2FA) ---------------------------- */

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpUri(email: string, secret: string): string {
  return generateURI({ issuer: "DuckeFlix", label: email, secret });
}

export function checkTotp(
  code: string,
  secret: string,
  epochMs?: number,
): boolean {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const useClientClock =
      typeof epochMs === "number" &&
      Number.isFinite(epochMs) &&
      epochMs > 946_684_800_000;
    return verifySync({
      token,
      secret,
      epochTolerance: 90,
      ...(useClientClock ? { epoch: Math.floor(epochMs / 1000) } : {}),
    }).valid;
  } catch {
    return false;
  }
}

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "duckeflix-dev-auth-secret-change-in-production",
);

export const SESSION_COOKIE = "ducke_session";
export const PRE_COOKIE = "ducke_pre";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/* ------------------------------ senhas ------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return test.length === expected.length && timingSafeEqual(test, expected);
}

export { isGmail } from "@/lib/auth-helpers";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/* ------------------------------ caches ------------------------------ */

const roleCache = new Map<number, Role>();
let roleCacheAt = 0;

const planCache = new Map<number, SubscriptionPlan>();
let planCacheAt = 0;

export function invalidateRoleCache() {
  roleCacheAt = 0;
  roleCache.clear();
}

export function invalidatePlanCache() {
  planCacheAt = 0;
  planCache.clear();
}

async function getAllRoles(): Promise<Role[]> {
  if (Date.now() - roleCacheAt < 5000 && roleCache.size > 0) {
    return [...roleCache.values()];
  }
  const all = await db.select().from(roles);
  roleCache.clear();
  for (const r of all) roleCache.set(r.id, r);
  roleCacheAt = Date.now();
  return all;
}

export async function getRoleById(id: number): Promise<Role | null> {
  const all = await getAllRoles();
  return all.find((r) => r.id === id) ?? null;
}

export async function getRoleByName(name: string): Promise<Role | null> {
  const all = await getAllRoles();
  return all.find((r) => r.name === name) ?? null;
}

async function getAllPlans(): Promise<SubscriptionPlan[]> {
  if (Date.now() - planCacheAt < 5000 && planCache.size > 0) {
    return [...planCache.values()];
  }
  const all = await db.select().from(subscriptionPlans);
  planCache.clear();
  for (const p of all) planCache.set(p.id, p);
  planCacheAt = Date.now();
  return all;
}

export async function getPlanById(
  id: number,
): Promise<SubscriptionPlan | null> {
  const all = await getAllPlans();
  return all.find((p) => p.id === id) ?? null;
}

export async function getPlanBySlug(
  slug: string,
): Promise<SubscriptionPlan | null> {
  const all = await getAllPlans();
  return all.find((p) => p.slug === slug) ?? null;
}

/* ----------------------- permissões / assinatura ---------------------- */

function legacyAdminPerms(): Permissions {
  return {
    accessPanel: true,
    manageVideos: true,
    manageUsers: true,
    manageVip: true,
    manageRoles: true,
    assignRoles: true,
    managePlans: true,
    manageAds: true,
    manageChat: true,
    manageSettings: true,
    viewVipContent: true,
  };
}

export function isLegacyVipActive(user: {
  plan: string;
  vipUntil: Date | null;
}): boolean {
  if (user.plan !== "vip") return false;
  if (!user.vipUntil) return true;
  return user.vipUntil.getTime() > Date.now();
}

export async function getUserPermissions(user: User): Promise<Permissions> {
  if (!user.roleId) {
    if (user.role === "admin") return legacyAdminPerms();
    return { ...NO_PERMISSIONS, viewVipContent: isLegacyVipActive(user) };
  }
  const role = await getRoleById(user.roleId);
  return role?.permissions ?? NO_PERMISSIONS;
}

export async function getUserLevel(user: User): Promise<number> {
  if (!user.roleId) return user.role === "admin" ? 100 : 0;
  const role = await getRoleById(user.roleId);
  return role?.level ?? 0;
}

export async function isSubscriptionActive(user: User): Promise<boolean> {
  if (!user.subscriptionPlanId) return false;
  if (!user.subscriptionEndsAt) return true;
  return user.subscriptionEndsAt.getTime() > Date.now();
}

export async function getUserPlan(user: User): Promise<SubscriptionPlan | null> {
  if (!user.subscriptionPlanId) return null;
  return getPlanById(user.subscriptionPlanId);
}

export async function isVipActive(user: User): Promise<boolean> {
  const plan = await getUserPlan(user);
  const paidPlanVip = Boolean(plan?.grantsVip) && (await isSubscriptionActive(user));
  const roleVip = (await getUserPermissions(user)).viewVipContent;
  return paidPlanVip || roleVip || isLegacyVipActive(user);
}

export async function shouldShowAds(user: User | null): Promise<boolean> {
  if (!user) return true;
  const plan = await getUserPlan(user);
  if (plan && (await isSubscriptionActive(user))) {
    return !plan.adFree;
  }
  return !isLegacyVipActive(user);
}

export async function toSafeUser(user: User): Promise<SafeUser> {
  const role = user.roleId ? await getRoleById(user.roleId) : null;
  const plan = user.subscriptionPlanId ? await getPlanById(user.subscriptionPlanId) : null;
  const perms = role?.permissions ?? (user.role === "admin"
    ? legacyAdminPerms()
    : { ...NO_PERMISSIONS, viewVipContent: isLegacyVipActive(user) });
  const paidActive = plan ? await isSubscriptionActive(user) : false;
  const isVip = (plan?.grantsVip && paidActive) || perms.viewVipContent || isLegacyVipActive(user);
  const showAds = plan ? !plan.adFree || !paidActive : !isVip;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleId: user.roleId,
    roleName: role?.name ?? (user.role === "admin" ? "Admin" : "Membro"),
    roleLevel: role?.level ?? (user.role === "admin" ? 100 : 0),
    roleColor: role?.color ?? (user.role === "admin" ? "#3b82f6" : "#71717a"),
    roleIcon: role?.icon ?? "User",
    permissions: perms,
    plan: user.plan,
    subscriptionPlanId: user.subscriptionPlanId,
    subscriptionPlanName: plan?.name ?? (isLegacyVipActive(user) ? "VIP legado" : "Grátis"),
    subscriptionPlanSlug: plan?.slug ?? (isLegacyVipActive(user) ? "vip-legado" : "free"),
    subscriptionEndsAt: user.subscriptionEndsAt ? user.subscriptionEndsAt.toISOString() : null,
    status: user.status,
    vipUntil: user.vipUntil ? user.vipUntil.toISOString() : null,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    isVip,
    isPaid: Boolean(plan && paidActive),
    showAds,
    has2fa: Boolean(user.totpSecret),
  };
}

/* ---------------------------- tokens JWT ---------------------------- */

async function signToken(payload: Record<string, unknown>, exp: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(SECRET);
}

async function readToken<T extends Record<string, unknown>>(
  token: string | undefined,
  purpose: string,
): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.purpose !== purpose) return null;
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export function cookieOptions(request: Request, maxAge: number) {
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = forwarded ?? new URL(request.url).protocol.replace(":", "");
  const isHttps = proto === "https";
  return {
    httpOnly: true,
    sameSite: isHttps ? ("none" as const) : ("lax" as const),
    secure: isHttps,
    path: "/",
    maxAge,
  };
}

export const createSessionToken = (userId: number) =>
  signToken({ sub: String(userId), purpose: "session" }, "7d");

export const createPreToken = (userId: number) =>
  signToken({ sub: String(userId), purpose: "pre" }, "5m");

export async function readPreToken(token: string | undefined) {
  const payload = await readToken<{ sub?: string }>(token, "pre");
  const id = Number(payload?.sub);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function readSessionToken(
  token: string | undefined,
): Promise<number | null> {
  const payload = await readToken<{ sub?: string }>(token, "session");
  const id = Number(payload?.sub);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* ----------------------------- consultas ---------------------------- */

export async function getUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return user ?? null;
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const id = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const user = await getUserById(id);
  if (!user || user.status === "suspended") return null;
  return user;
}

export async function getUserForApi(request: Request): Promise<User | null> {
  const authz = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authz);
  if (match) {
    const id = await readSessionToken(match[1].trim());
    if (id) {
      const user = await getUserById(id);
      if (user && user.status !== "suspended") return user;
    }
  }
  return getSessionUser();
}

export async function getAdminForApi(request: Request): Promise<User | null> {
  const user = await getUserForApi(request);
  if (!user) return null;
  const perms = await getUserPermissions(user);
  return perms.accessPanel ? user : null;
}

export async function requirePermission(
  request: Request,
  perm: keyof Permissions,
): Promise<{ user: User; perms: Permissions } | null> {
  const user = await getUserForApi(request);
  if (!user) return null;
  const perms = await getUserPermissions(user);
  if (!perms[perm]) return null;
  return { user, perms };
}

/* --------------------------- rate limiting --------------------------- */

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitOk(
  key: string,
  maxAttempts: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count += 1;
  return true;
}
