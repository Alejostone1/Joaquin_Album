import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { USE_BLOB } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Diagnóstico sin datos privados: sólo indica si cada pieza responde. */
export async function GET() {
  const out: Record<string, unknown> = { storage: USE_BLOB ? "blob" : "local" };
  try {
    const last = await db.query.media.findFirst({ where: eq(schema.media.kind, "IMAGE"), orderBy: [desc(schema.media.createdAt)] });
    out.db = "ok";
    if (USE_BLOB && last) {
      const blob = await import("@/lib/blob");
      const path = blob.blobVariantPath(last, "sm");
      out.stream = await blob.blobStreamCheck(path);
      try {
        const url = await blob.blobSignedUrl(path);
        out.presign = (await fetch(url, { method: "GET", headers: { Range: "bytes=0-15" } })).status;
      } catch (e) {
        out.presign = `error: ${(e as Error).name}`;
      }
    }
  } catch (e) {
    out.error = (e as Error).name;
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
