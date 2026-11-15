import { NextResponse } from "next/server";
import { AuthError, assertSameOrigin, assertUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { toMediaDTO } from "@/lib/story";
import { ingestFile, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, streamToTemp, UploadError, USE_BLOB } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Subida de UN archivo por petición, en streaming directo a disco
 * (el cliente envía el archivo como cuerpo y el nombre en "x-file-name").
 */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const user = await assertUser("EDITOR");
    if (USE_BLOB) throw new UploadError("En este servidor las subidas van directo al almacenamiento privado. Recarga la página.");
    if (!req.body) throw new UploadError("No llegó ningún archivo.");
    const declared = req.headers.get("content-type") ?? "";
    const max = declared.startsWith("video/") ? MAX_VIDEO_BYTES : Math.max(MAX_IMAGE_BYTES, 1);
    const length = Number(req.headers.get("content-length") || 0);
    if (length && length > max) throw new UploadError("El archivo supera el tamaño máximo permitido.");

    const name = decodeURIComponent(req.headers.get("x-file-name") || "archivo").slice(0, 180);
    const { tmp } = await streamToTemp(req.body, max);
    const ing = await ingestFile(tmp);
    const [row] = await db
      .insert(schema.media)
      .values({ ...ing, originalName: name, createdById: user.id, alt: null })
      .returning();
    return NextResponse.json({ media: toMediaDTO(row), originalName: row.originalName, createdAt: row.createdAt });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "No se pudo guardar el archivo. Inténtalo de nuevo." }, { status: 500 });
  }
}
