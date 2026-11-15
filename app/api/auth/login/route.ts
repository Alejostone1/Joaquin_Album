import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthError,
  assertSameOrigin,
  clearLoginAttempts,
  createSession,
  loginBlocked,
  registerFailedLogin,
  verifyPassword,
} from "@/lib/auth";
import { db, schema } from "@/lib/db";

const Body = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

// hash de referencia para igualar tiempos cuando el correo no existe
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5J0f1x6mJ3m3mQ8wE2pQvC6s1h8iY7S";

export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe un correo y una clave válidos." }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${ip}|${email}`;
  if (loginBlocked(key)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." }, { status: 429 });
  }

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) {
    registerFailedLogin(key);
    return NextResponse.json({ error: "El correo o la clave no coinciden." }, { status: 401 });
  }
  clearLoginAttempts(key);
  await createSession(user.id);
  return NextResponse.json({ ok: true, name: user.name });
}
