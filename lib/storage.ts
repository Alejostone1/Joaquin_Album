import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat, copyFile, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";

/** Carpeta privada: fuera de /public, nunca servida directamente. */
export const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR || "./storage");
const UPLOADS = path.join(STORAGE_ROOT, "uploads");
const TMP = path.join(STORAGE_ROOT, "tmp");

/** En Vercel los archivos van a Vercel Blob privado; en local, a la carpeta STORAGE_DIR. */
export const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

export const IMAGE_VARIANTS = { sm: 480, md: 1280, lg: 2048 } as const;
export type Variant = keyof typeof IMAGE_VARIANTS | "orig";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

export const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_MB || 30) * 1024 * 1024;
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_MB || 600) * 1024 * 1024;

export class UploadError extends Error {}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) throw new Error("AUTH_SECRET debe tener al menos 24 caracteres.");
  return s;
}

// ——— Enlaces temporales firmados ———
const LINK_BUCKET_MS = 60 * 60 * 1000; // agrupa por hora para que el navegador pueda cachear
const LINK_TTL_MS = 3 * 60 * 60 * 1000;

function sign(id: string, variant: string, exp: number) {
  return createHmac("sha256", secret()).update(`${id}:${variant}:${exp}`).digest("base64url").slice(0, 32);
}

export function signedMediaUrl(id: string, variant: Variant = "md") {
  const exp = Math.ceil((Date.now() + LINK_TTL_MS) / LINK_BUCKET_MS) * LINK_BUCKET_MS;
  return `/api/media/${id}?v=${variant}&e=${exp}&s=${sign(id, variant, exp)}`;
}

export function verifyMediaSignature(id: string, variant: string, exp: string | null, sig: string | null) {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = Buffer.from(sign(id, variant, expNum));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ——— Rutas en disco ———
export function mediaDir(storageKey: string) {
  const dir = path.join(UPLOADS, storageKey);
  if (!dir.startsWith(UPLOADS + path.sep)) throw new Error("Ruta inválida");
  return dir;
}

export function variantPath(storageKey: string, mimeType: string, variant: Variant) {
  const dir = mediaDir(storageKey);
  if (variant === "orig" || !mimeType.startsWith("image/")) return path.join(dir, "original");
  return path.join(dir, `${variant}.webp`);
}

export async function fileSize(p: string) {
  return (await stat(p)).size;
}

export { createReadStream };

// ——— Recepción de archivos ———
/** Guarda el cuerpo de la petición en un temporal, cortando si supera el máximo. */
export async function streamToTemp(body: ReadableStream<Uint8Array>, maxBytes: number) {
  await mkdir(TMP, { recursive: true });
  const tmp = path.join(TMP, `${randomUUID()}.part`);
  let total = 0;
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      total += chunk.byteLength;
      if (total > maxBytes) controller.error(new UploadError("El archivo supera el tamaño máximo permitido."));
      else controller.enqueue(chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(body.pipeThrough(limiter) as unknown as import("stream/web").ReadableStream),
      createWriteStream(tmp),
    );
  } catch (err) {
    await rm(tmp, { force: true });
    throw err instanceof UploadError ? err : new UploadError("No se pudo recibir el archivo completo.");
  }
  return { tmp, size: total };
}

export type IngestedMedia = {
  kind: "IMAGE" | "VIDEO";
  storageKey: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

/**
 * Valida el formato real (por los bytes, no por la extensión), guarda el original
 * sin modificarlo y genera versiones optimizadas para mostrar.
 */
export async function ingestFile(tmpPath: string, opts: { deleteSource?: boolean } = {}): Promise<IngestedMedia> {
  const mime = await sniffMime(tmpPath);
  const isImage = !!mime && IMAGE_TYPES.has(mime);
  const isVideo = !!mime && VIDEO_TYPES.has(mime);
  const cleanup = () => (opts.deleteSource === false ? Promise.resolve() : rm(tmpPath, { force: true }));

  if (!isImage && !isVideo) {
    await cleanup();
    throw new UploadError("Formato no admitido. Usa JPG, PNG, WEBP, AVIF, GIF, MP4, WEBM o MOV.");
  }
  const size = await fileSize(tmpPath);
  if (isImage && size > MAX_IMAGE_BYTES) {
    await cleanup();
    throw new UploadError("La foto supera el tamaño máximo permitido.");
  }

  const storageKey = newStorageKey();
  const dir = mediaDir(storageKey);
  await mkdir(dir, { recursive: true });
  const original = path.join(dir, "original");

  if (opts.deleteSource === false) await copyFile(tmpPath, original);
  else await rename(tmpPath, original).catch(async () => {
    await copyFile(tmpPath, original);
    await rm(tmpPath, { force: true });
  });

  if (isVideo) {
    return { kind: "VIDEO", storageKey, mimeType: mime!, size, width: null, height: null, blurDataUrl: null };
  }

  try {
    const v = await makeVariants(await readFile(original));
    for (const [name, buf] of Object.entries(v.variants)) await writeFile(path.join(dir, `${name}.webp`), buf);
    return { kind: "IMAGE", storageKey, mimeType: mime!, size, width: v.width, height: v.height, blurDataUrl: v.blurDataUrl };
  } catch {
    await rm(dir, { recursive: true, force: true });
    throw new UploadError("La imagen parece dañada y no se pudo procesar.");
  }
}

/**
 * Genera las versiones para mostrar (WebP sin metadatos: sin ubicación GPS)
 * y la miniatura borrosa. El original nunca se modifica.
 */
export async function makeVariants(input: Buffer) {
  // .rotate() aplica la orientación EXIF; las derivadas no conservan metadatos.
  const meta = await sharp(input, { failOn: "none", animated: false }).rotate().toBuffer({ resolveWithObject: true });
  const variants: Record<string, Buffer> = {};
  for (const [name, w] of Object.entries(IMAGE_VARIANTS)) {
    variants[name] = await sharp(meta.data)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: name === "sm" ? 74 : 82 })
      .toBuffer();
  }
  const blur = await sharp(meta.data).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
  return { width: meta.info.width, height: meta.info.height, blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`, variants };
}

export function newStorageKey() {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomUUID()}`;
}

export { IMAGE_TYPES, VIDEO_TYPES };

/** Elimina todos los archivos de un recuerdo (disco local o Vercel Blob). */
export async function deleteStoredMedia(item: { storageKey: string; originalPath?: string | null }) {
  if (USE_BLOB) {
    const { blobDeleteMedia } = await import("./blob");
    await blobDeleteMedia(item);
    return;
  }
  await rm(mediaDir(item.storageKey), { recursive: true, force: true });
}

/** Detecta el formato real leyendo los primeros bytes (firma del archivo). */
export async function sniffMime(file: string): Promise<string | undefined> {
  const fh = await open(file, "r");
  const buf = Buffer.alloc(64);
  try {
    await fh.read(buf, 0, 64, 0);
  } finally {
    await fh.close();
  }
  return sniffBuffer(buf);
}

export function sniffBuffer(buf: Buffer): string | undefined {
  const ascii = (start: number, end: number) => buf.toString("latin1", start, end);
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand === "qt  ") return "video/quicktime";
    if (/^(isom|iso\d|mp4\d|avc1|M4V |M4VP|dash|mmp4|MSNV|f4v )$/.test(brand)) return "video/mp4";
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand === "mif1") return undefined;
    return "video/mp4";
  }
  return undefined;
}
