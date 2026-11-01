import {
  boolean,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* ======================== CATÁLOGO ======================== */

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Geral"),
  videoUrl: text("video_url").notNull(),
  thumbUrl: text("thumb_url"),
  year: integer("year"),
  durationSec: integer("duration_sec"),
  rating: text("rating").notNull().default("L"),
  source: text("source").notNull().default("url"),
  featured: boolean("featured").notNull().default(false),
  vipOnly: boolean("vip_only").notNull().default(false),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

/* ======================== CARGOS / ROLES ======================== */

export type Permissions = {
  accessPanel: boolean;
  manageVideos: boolean;
  manageUsers: boolean;
  manageVip: boolean;
  manageRoles: boolean;
  assignRoles: boolean;
  managePlans: boolean;
  manageAds: boolean;
  manageChat: boolean;
  manageSettings: boolean;
  viewVipContent: boolean;
};

export const ALL_PERMISSIONS: (keyof Permissions)[] = [
  "accessPanel",
  "manageVideos",
  "manageUsers",
  "manageVip",
  "manageRoles",
  "assignRoles",
  "managePlans",
  "manageAds",
  "manageChat",
  "manageSettings",
  "viewVipContent",
];

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  accessPanel: "Acessar painel admin",
  manageVideos: "Gerenciar catálogo (vídeos)",
  manageUsers: "Gerenciar contas de usuários",
  manageVip: "Conceder / revogar VIP",
  manageRoles: "Criar / editar / excluir cargos",
  assignRoles: "Atribuir cargos a usuários",
  managePlans: "Criar / editar planos",
  manageAds: "Gerenciar anúncios",
  manageChat: "Atender chat / suporte",
  manageSettings: "Configurações gerais / PIX",
  viewVipContent: "Assistir conteúdo exclusivo VIP",
};

export const NO_PERMISSIONS: Permissions = {
  accessPanel: false,
  manageVideos: false,
  manageUsers: false,
  manageVip: false,
  manageRoles: false,
  assignRoles: false,
  managePlans: false,
  manageAds: false,
  manageChat: false,
  manageSettings: false,
  viewVipContent: false,
};

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  level: integer("level").notNull().default(0),
  color: text("color").notNull().default("#71717a"),
  icon: text("icon").notNull().default("User"),
  permissions: json("permissions").$type<Permissions>().notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

/* ======================== PLANOS / ASSINATURAS ======================== */

/**
 * Planos de assinatura configuráveis pelo admin.
 *
 * - grantsVip: libera catálogo VIP
 * - adFree: remove anúncios
 * - durationDays: 0 = vitalício/manual
 */
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull().default(0),
  durationDays: integer("duration_days").notNull().default(0),
  grantsVip: boolean("grants_vip").notNull().default(false),
  adFree: boolean("ad_free").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  color: text("color").notNull().default("#71717a"),
  benefits: json("benefits").$type<string[]>().notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/* ======================== CONTAS ======================== */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret"),
  roleId: integer("role_id"),
  /** @deprecated legado */
  role: text("role").notNull().default("user"),
  /** @deprecated legado */
  plan: text("plan").notNull().default("free"),
  subscriptionPlanId: integer("subscription_plan_id"),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  /** legado: mantido para compatibilidade com usuários antigos VIP */
  vipUntil: timestamp("vip_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type SafeUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId: number | null;
  roleName: string;
  roleLevel: number;
  roleColor: string;
  roleIcon: string;
  permissions: Permissions;
  plan: string;
  subscriptionPlanId: number | null;
  subscriptionPlanName: string;
  subscriptionPlanSlug: string;
  subscriptionEndsAt: string | null;
  status: string;
  vipUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  isVip: boolean;
  isPaid: boolean;
  showAds: boolean;
  has2fa: boolean;
};

/* ======================== ANÚNCIOS ======================== */

export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  imageUrl: text("image_url"),
  targetUrl: text("target_url"),
  cta: text("cta").notNull().default("Saiba mais"),
  placement: text("placement").notNull().default("home"),
  targetAudience: text("target_audience").notNull().default("free"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;

/* ======================== CONFIGURAÇÕES ======================== */

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;

/* ======================== CHAT / SUPORTE ======================== */

export const chatThreads = pgTable("chat_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull().default("Atendimento DuckeFlix"),
  status: text("status").notNull().default("open"),
  unreadUser: integer("unread_user").notNull().default(0),
  unreadAdmin: integer("unread_admin").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChatThread = typeof chatThreads.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderUserId: integer("sender_user_id"),
  content: text("content").notNull(),
  presetId: integer("preset_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

export const cannedReplies = pgTable("canned_replies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CannedReply = typeof cannedReplies.$inferSelect;

/** @deprecated legado */
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
