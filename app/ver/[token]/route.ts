import { NextResponse } from "next/server";
import { findShareLink, GUEST_COOKIE, markShareUse } from "@/lib/guest";

export const dynamic = "force-dynamic";

/** Enlace para compartir: guarda el pase de invitado y abre la historia (sólo lectura). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await findShareLink(token);
  const url = new URL(req.url);
  const base = `${req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")}://${req.headers.get("x-forwarded-host") ?? url.host}`;
  if (!link) return NextResponse.redirect(`${base}/?enlace=vencido`, { headers: { "X-Robots-Tag": "noindex" } });
  await markShareUse(link.id);
  const res = NextResponse.redirect(`${base}/historia`, { headers: { "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
  res.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: 60 * 60 * 24 * 120,
  });
  return res;
}
