import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bienvenida — Joaquín", robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user =
    token.length >= 20 && token.length <= 80
      ? await db.query.users.findFirst({
          where: and(eq(schema.users.inviteTokenHash, createHash("sha256").update(token).digest("hex")), gt(schema.users.inviteExpiresAt, new Date())),
        })
      : null;
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[#E3F2E1] px-5 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#FFE89A] opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#FFB7CF] opacity-50 blur-3xl" />
      <div className="relative w-full max-w-md rounded-[2rem] border-[3px] border-tinta bg-papel p-7 shadow-lift sm:p-9">
        {user ? (
          <InviteForm token={token} name={user.name} relation={user.relation} email={user.email} />
        ) : (
          <div className="text-center">
            <p className="font-display text-3xl font-semibold">Este enlace ya no sirve</p>
            <p className="mt-3 font-ui font-semibold text-tinta-soft">Ya se usó o venció. Pídele a quien administra el álbum un enlace nuevo.</p>
            <Link href="/" className="btn-soft mt-6 inline-flex">
              Ir al inicio
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
