import { eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getGuest } from "@/lib/guest";
import { db, schema } from "@/lib/db";
import { USE_BLOB, variantPath, verifyMediaSignature, type Variant } from "@/lib/storage";

const VARIANTS = new Set(["sm", "md", "lg", "orig"]);

function notFound() {
  return new Response("No encontrado", { status: 404 });
}

/**
 * Sirve una foto o video privado. Exige a la vez:
 *  1) una sesión válida de la familia, y
 *  2) un enlace firmado y vigente (caduca en pocas horas).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const variant = url.searchParams.get("v") ?? "md";
  if (!VARIANTS.has(variant)) return notFound();

  const user = await getCurrentUser();
  if (!user && !(await getGuest())) return new Response("Inicia sesión", { status: 401 });
  if (!verifyMediaSignature(id, variant, url.searchParams.get("e"), url.searchParams.get("s"))) {
    return new Response("Enlace vencido", { status: 403 });
  }

  const item = await db.query.media.findFirst({ where: eq(schema.media.id, id) });
  if (!item) return notFound();
  // el original de una foto conserva metadatos (p. ej. ubicación): sólo para quienes editan
  if (variant === "orig" && item.kind === "IMAGE" && !hasRole(user, "EDITOR")) return new Response("Sin permiso", { status: 403 });

  // Vercel Blob privado
  if (USE_BLOB) {
    const { blobServe, blobSignedUrl, blobVariantPath } = await import("@/lib/blob");
    const path = blobVariantPath(item, variant as Variant);
    const isSmall = item.kind === "IMAGE" && variant !== "orig";
    // Videos y originales: enlace firmado de pocos minutos (no pasan por la función)
    if (!isSmall) {
      try {
        const url = await blobSignedUrl(path);
        return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=600", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
      } catch (e) {
        console.error("presign", (e as Error).message);
      }
    }
    // Fotos (versiones WebP livianas) o respaldo: se entregan directamente
    const served = await blobServe(path, req.headers.get("range"));
    if (!served) return notFound();
    return new Response(served.stream, {
      status: served.status,
      headers: { ...served.headers, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" },
    });
  }

  const file = variantPath(item.storageKey, item.mimeType, variant as Variant);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return notFound();
  }
  const type = variant !== "orig" && item.kind === "IMAGE" ? "image/webp" : item.mimeType;
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    "X-Robots-Tag": "noindex",
  };

  // Rango (necesario para reproducir y adelantar videos, sobre todo en iPhone)
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start = m[1] ? Number(m[1]) : NaN;
      let end = m[2] ? Number(m[2]) : NaN;
      if (Number.isNaN(start)) {
        start = size - end;
        end = size - 1;
      }
      if (Number.isNaN(end) || end >= size) end = size - 1;
      if (start < 0 || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
      return new Response(stream, {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
      });
    }
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
