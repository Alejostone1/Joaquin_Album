import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, assertSameOrigin, assertUser } from "@/lib/auth";
import { blobIngestUploaded } from "@/lib/blob";
import { db, schema } from "@/lib/db";
import { toMediaDTO } from "@/lib/story";
import { UploadError } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Tras subir a Blob: valida el archivo, crea las versiones y lo registra en la biblioteca. */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const user = await assertUser("EDITOR");
    const { pathname, originalName } = z.object({ pathname: z.string().min(1).max(400), originalName: z.string().max(180) }).parse(await req.json());
    const ing = await blobIngestUploaded(pathname);
    const [row] = await db
      .insert(schema.media)
      .values({ ...ing, originalName: originalName || "archivo", createdById: user.id, alt: null })
      .returning();
    await logActivity(user, "UPLOAD", "MEDIA", row.kind === "VIDEO" ? "subió un video" : "subió una foto", row.id);
    return NextResponse.json({ media: toMediaDTO(row), originalName: row.originalName, createdAt: row.createdAt });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "No se pudo guardar el archivo. Inténtalo de nuevo." }, { status: 500 });
  }
}
