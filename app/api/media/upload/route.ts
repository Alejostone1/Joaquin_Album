import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { AuthError, assertSameOrigin, assertUser } from "@/lib/auth";
import { MAX_VIDEO_BYTES } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

/**
 * Emite un token de un solo uso para que el navegador suba el archivo
 * directamente a Vercel Blob (privado), sin pasar por la función (sin límite de 4,5 MB).
 */
export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const body = (await req.json()) as HandleUploadBody;
    if (body.type !== "blob.generate-client-token") return NextResponse.json({ error: "Operación no admitida." }, { status: 400 });
    await assertUser("EDITOR");
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("incoming/") || pathname.includes("..")) throw new Error("Ruta no permitida.");
        return { allowedContentTypes: ALLOWED, maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: true };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: (e as Error).message || "No se pudo preparar la subida." }, { status: 400 });
  }
}
