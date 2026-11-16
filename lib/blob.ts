// Almacenamiento privado en Vercel Blob (producción en Vercel).
// Nada es público: los archivos se leen con enlaces firmados de vida corta,
// emitidos sólo después de comprobar la sesión y la firma propia de la app.
import { del, get, head, issueSignedToken, presignUrl, put, type IssuedSignedToken } from "@vercel/blob";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, makeVariants, newStorageKey, sniffBuffer, UploadError, VIDEO_TYPES, type IngestedMedia, type Variant } from "./storage";

const ACCESS = "private" as const;

export function blobVariantPath(item: { storageKey: string; mimeType: string; originalPath?: string | null }, variant: Variant) {
  if (variant === "orig" || !item.mimeType.startsWith("image/")) return item.originalPath || `media/${item.storageKey}/original`;
  return `media/${item.storageKey}/${variant}.webp`;
}

// Tokens de lectura por archivo (la delegación debe nombrar la ruta exacta),
// reutilizados mientras sigan vigentes para no llamar a la API en cada petición.
const tokens = new Map<string, IssuedSignedToken>();
async function readToken(pathname: string) {
  const hit = tokens.get(pathname);
  if (hit && Number(hit.validUntil) - Date.now() > 10 * 60 * 1000) return hit;
  const t = await issueSignedToken({ pathname, operations: ["get"], validUntil: Date.now() + 60 * 60 * 1000 });
  if (tokens.size > 500) tokens.clear();
  tokens.set(pathname, t);
  return t;
}

export async function blobSignedUrl(pathname: string, minutes = 15) {
  const token = await readToken(pathname);
  const { presignedUrl } = await presignUrl(token, {
    operation: "get",
    pathname,
    access: ACCESS,
    validUntil: Math.min(Number(token.validUntil), Date.now() + minutes * 60 * 1000),
  });
  return presignedUrl;
}

/** Entrega un archivo privado a través de la función (con soporte de rangos para video). */
export async function blobServe(pathname: string, range: string | null) {
  const res = await get(pathname, { access: ACCESS, headers: range ? { Range: range } : undefined });
  if (!res || !res.stream) return null;
  const upstream = res.headers;
  const headers: Record<string, string> = {
    "Content-Type": res.blob.contentType || "application/octet-stream",
    "Accept-Ranges": "bytes",
  };
  for (const h of ["content-length", "content-range", "etag", "last-modified"]) {
    const v = upstream.get(h);
    if (v) headers[h.replace(/(^|-)\w/g, (m) => m.toUpperCase())] = v;
  }
  const status = upstream.get("content-range") ? 206 : 200;
  return { stream: res.stream, headers, status };
}

export async function blobStreamCheck(pathname: string) {
  try {
    const res = await get(pathname, { access: ACCESS });
    await res?.stream?.cancel().catch(() => {});
    return res?.statusCode ?? "not-found";
  } catch (e) {
    return `error: ${(e as Error).name}`;
  }
}

async function readHead(pathname: string) {
  const res = await get(pathname, { access: ACCESS, headers: { Range: "bytes=0-63" } });
  if (!res || !res.stream) throw new UploadError("No se encontró el archivo subido.");
  const reader = res.stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < 64) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const meta = await head(pathname);
  return { head: Buffer.concat(chunks).subarray(0, 64), size: meta.size };
}

async function readAll(pathname: string, max: number) {
  const res = await get(pathname, { access: ACCESS, useCache: false });
  if (!res || !res.stream) throw new UploadError("No se encontró el archivo subido.");
  const reader = res.stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      throw new UploadError("La foto supera el tamaño máximo permitido.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function blobPut(pathname: string, data: Buffer, contentType: string) {
  await put(pathname, data, { access: ACCESS, contentType, addRandomSuffix: false, allowOverwrite: true });
}

/**
 * Procesa un archivo que el navegador subió directamente a Blob (carpeta incoming/):
 * valida el formato real, deja el original intacto y crea las versiones para mostrar.
 */
export async function blobIngestUploaded(pathname: string): Promise<IngestedMedia & { originalPath: string }> {
  if (!pathname.startsWith("incoming/") || pathname.includes("..")) throw new UploadError("Ruta de archivo no válida.");
  const first = await readHead(pathname);
  const size = first.size;
  const mime = sniffBuffer(Buffer.concat([first.head, Buffer.alloc(64)]).subarray(0, 64));
  const isImage = !!mime && IMAGE_TYPES.has(mime);
  const isVideo = !!mime && VIDEO_TYPES.has(mime);
  if (!isImage && !isVideo) {
    await del(pathname).catch(() => {});
    throw new UploadError("Formato no admitido. Usa JPG, PNG, WEBP, AVIF, GIF, MP4, WEBM o MOV.");
  }
  if ((isImage && size > MAX_IMAGE_BYTES) || (isVideo && size > MAX_VIDEO_BYTES)) {
    await del(pathname).catch(() => {});
    throw new UploadError("El archivo supera el tamaño máximo permitido.");
  }
  const storageKey = newStorageKey();
  if (isVideo) return { kind: "VIDEO", storageKey, mimeType: mime!, size, width: null, height: null, blurDataUrl: null, originalPath: pathname };
  try {
    const buf = await readAll(pathname, MAX_IMAGE_BYTES);
    const v = await makeVariants(buf);
    await Promise.all(Object.entries(v.variants).map(([name, data]) => blobPut(`media/${storageKey}/${name}.webp`, data, "image/webp")));
    return { kind: "IMAGE", storageKey, mimeType: mime!, size: buf.length, width: v.width, height: v.height, blurDataUrl: v.blurDataUrl, originalPath: pathname };
  } catch (e) {
    if (e instanceof UploadError) throw e;
    throw new UploadError("La imagen parece dañada y no se pudo procesar.");
  }
}

/** Para el seed: sube un archivo local completo (original + versiones). */
export async function blobIngestBuffer(buf: Buffer, name: string): Promise<IngestedMedia & { originalPath: string }> {
  const mime = sniffBuffer(buf.subarray(0, 64));
  if (!mime || !IMAGE_TYPES.has(mime)) throw new UploadError(`Formato no admitido: ${name}`);
  const storageKey = newStorageKey();
  const originalPath = `media/${storageKey}/original`;
  await blobPut(originalPath, buf, mime);
  const v = await makeVariants(buf);
  await Promise.all(Object.entries(v.variants).map(([n, data]) => blobPut(`media/${storageKey}/${n}.webp`, data, "image/webp")));
  return { kind: "IMAGE", storageKey, mimeType: mime, size: buf.length, width: v.width, height: v.height, blurDataUrl: v.blurDataUrl, originalPath };
}

export async function blobDeleteMedia(item: { storageKey: string; originalPath?: string | null }) {
  const paths = ["sm", "md", "lg"].map((v) => `media/${item.storageKey}/${v}.webp`);
  paths.push(item.originalPath || `media/${item.storageKey}/original`);
  await del(paths).catch(() => {});
}
