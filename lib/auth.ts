import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import type { RoleId } from "@/lib/constants";

export const SESSION_COOKIE = "jq_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;

const ROLE_RANK: Record<RoleId, number> = { FAMILY: 1, EDITOR: 2, ADMIN: 3 };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  relation: string | null;
  /** dueño oculto (super administrador) */
  isOwner?: boolean;
};

export function hasRole(user: Pick<SessionUser, "role"> | null | undefined, min: RoleId) {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[min];
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function cookieSecure() {
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const ua = (await headers()).get("user-agent")?.slice(0, 250) ?? null;
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt, userAgent: ua });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });
  // limpieza oportunista de sesiones vencidas
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual (validado contra la base de datos), memorizado por petición. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      relation: schema.users.relation,
      active: schema.users.active,
      isOwner: schema.users.isOwner,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.active) return null;

  // renovación deslizante
  if (row.expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * 864e5) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
    await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.id, row.sessionId));
    try {
      (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure(),
        path: "/",
        expires: expiresAt,
      });
    } catch {
      // en Server Components no se pueden escribir cookies; se renovará en la próxima acción
    }
  }
  return { id: row.id, name: row.name, email: row.email, role: row.role, relation: row.relation, isOwner: row.isOwner };
});

/** Para páginas: redirige a la portada si no hay sesión o el rol no alcanza. */
export async function requireUser(min: RoleId = "FAMILY") {
  const user = await getCurrentUser();
  if (!user) redirect("/?acceso=1");
  if (!hasRole(user, min)) redirect("/historia");
  return user;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

/** Para acciones y rutas API: lanza AuthError en lugar de redirigir. */
export async function assertUser(min: RoleId = "FAMILY") {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Inicia sesión para continuar.");
  if (!hasRole(user, min)) throw new AuthError(403, "Tu cuenta no tiene permiso para hacer esto.");
  return user;
}

/** Comprueba que la petición viene de este mismo sitio (defensa CSRF para rutas API). */
export async function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // navegadores antiguos / misma navegación
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    /* noop */
  }
  throw new AuthError(403, "Origen no permitido.");
}

// ——— Limitador de intentos de inicio de sesión (memoria del proceso) ———
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

export function loginBlocked(key: string) {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() > a.until) {
    attempts.delete(key);
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
}
export function registerFailedLogin(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() > a.until) attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else a.count += 1;
}
export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}

/** Ids de los dueños ocultos: los demás no los ven en personas, historial ni como autores. */
export const getOwnerIds = cache(async (): Promise<string[]> => {
  const rows = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.isOwner, true));
  return rows.map((r) => r.id);
});
