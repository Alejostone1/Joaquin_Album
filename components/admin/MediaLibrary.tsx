"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteMedia, updateMedia } from "@/app/admin/actions";
import { Media } from "@/components/story/Media";
import { EggIcon } from "@/components/ui/Watercolor";
import type { LibraryItem } from "@/lib/admin-data";
import { ConfirmButton, useToast } from "./ui";

const MAX_IMAGE_MB = 30;
const MAX_VIDEO_MB = 600;

type QueueItem = {
  key: string;
  file: File;
  preview: string | null;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
};

const BLOB_MODE = process.env.NEXT_PUBLIC_STORAGE === "blob";

/** Vercel: el archivo va directo del navegador al almacenamiento privado y luego se registra. */
async function uploadViaBlob(file: File, onProgress: (p: number) => void): Promise<LibraryItem> {
  const { upload } = await import("@vercel/blob/client");
  const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "-").slice(-80) || "archivo";
  const blob = await upload(`incoming/${safe}`, file, {
    access: "private",
    handleUploadUrl: "/api/media/upload",
    contentType: file.type || undefined,
    multipart: file.size > 40 * 1048576,
    onUploadProgress: (e) => onProgress(Math.min(0.97, e.percentage / 100)),
  });
  const res = await fetch("/api/media/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pathname: blob.pathname, originalName: file.name }),
  });
  const data = (await res.json().catch(() => ({}))) as { media?: LibraryItem; error?: string; originalName?: string; createdAt?: string };
  if (!res.ok || !data.media) throw new Error(data.error ?? "No se pudo guardar.");
  onProgress(1);
  return { ...data.media, originalName: data.originalName ?? file.name, createdAt: data.createdAt ?? new Date().toISOString(), size: file.size, usage: 0 };
}

function uploadOne(file: File, onProgress: (p: number) => void) {
  if (BLOB_MODE) return uploadViaBlob(file, onProgress);
  return new Promise<LibraryItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data: { media?: LibraryItem; error?: string; originalName?: string; createdAt?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* noop */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.media) {
        resolve({ ...data.media, originalName: data.originalName ?? file.name, createdAt: data.createdAt ?? new Date().toISOString(), size: file.size, usage: 0 });
      } else reject(new Error(data.error ?? "No se pudo subir."));
    };
    xhr.onerror = () => reject(new Error("Se perdió la conexión durante la subida."));
    xhr.send(file);
  });
}

/** Zona para arrastrar o elegir varias fotos y videos, con vista previa y progreso. */
export function Uploader({ onUploaded, compact = false }: { onUploaded: (item: LibraryItem) => void; compact?: boolean }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const running = useRef(0);
  const started = useRef(new Set<string>());
  const toast = useToast();

  const patch = (key: string, p: Partial<QueueItem>) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const pump = useCallback(
    (q: QueueItem[]) => {
      const next = q.filter((x) => x.status === "waiting" && !started.current.has(x.key)).slice(0, Math.max(0, 2 - running.current));
      for (const item of next) {
        running.current++;
        started.current.add(item.key);
        patch(item.key, { status: "uploading" });
        uploadOne(item.file, (p) => patch(item.key, { progress: p }))
          .then((m) => {
            patch(item.key, { status: "done", progress: 1 });
            onUploaded(m);
          })
          .catch((e: Error) => patch(item.key, { status: "error", error: e.message }))
          .finally(() => {
            running.current--;
            setQueue((cur) => {
              setTimeout(() => pump(cur), 0);
              return cur;
            });
          });
      }
    },
    [onUploaded],
  );

  const add = (files: FileList | File[]) => {
    const items: QueueItem[] = [];
    for (const file of Array.from(files)) {
      const isImg = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");
      const key = `${file.name}-${file.size}-${Math.random()}`;
      let error: string | undefined;
      if (!isImg && !isVid) error = "Formato no admitido.";
      else if (isImg && file.size > MAX_IMAGE_MB * 1048576) error = `La foto pesa más de ${MAX_IMAGE_MB} MB.`;
      else if (isVid && file.size > MAX_VIDEO_MB * 1048576) error = `El video pesa más de ${MAX_VIDEO_MB} MB.`;
      items.push({ key, file, preview: isImg || isVid ? URL.createObjectURL(file) : null, progress: 0, status: error ? "error" : "waiting", error });
    }
    if (!items.length) return;
    setQueue((q) => {
      const nq = [...items, ...q];
      setTimeout(() => pump(nq), 0);
      return nq;
    });
  };

  const done = queue.filter((q) => q.status === "done").length;
  useEffect(() => {
    if (done && queue.every((q) => q.status === "done" || q.status === "error")) toast(`${done} ${done === 1 ? "archivo subido" : "archivos subidos"}.`);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-[2rem] border-[3px] border-dashed text-center transition ${compact ? "p-5" : "p-10"} ${over ? "scale-[1.01] border-turquesa bg-turquesa-100" : "border-tinta/20 bg-crema/60"}`}
      >
        <motion.div animate={over ? { rotate: [0, -10, 10, 0] } : {}} transition={{ repeat: over ? Infinity : 0, duration: 0.6 }}>
          <EggIcon className={compact ? "h-12 w-10" : "h-20 w-16"} />
        </motion.div>
        <p className="font-heading text-xl font-bold">{over ? "¡Suéltalas aquí!" : "Arrastra aquí fotos y videos"}</p>
        <p className="font-ui text-sm font-semibold text-tinta-mute">JPG, PNG, WEBP, MP4, MOV… Las fotos originales se guardan intactas y en privado.</p>
        <button type="button" className="btn-soft" onClick={() => input.current?.click()}>
          Elegir archivos
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*,video/*"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {queue.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {queue.map((q) => (
            <li key={q.key} className="relative overflow-hidden rounded-2xl border-2 border-tinta/10 bg-papel">
              <div className="aspect-square bg-salvia-100">
                {q.preview && q.file.type.startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.preview} alt="" className="h-full w-full object-cover" />
                )}
                {q.preview && q.file.type.startsWith("video/") && <video src={q.preview} muted className="h-full w-full object-cover" />}
              </div>
              <div className="p-2">
                <p className="truncate font-ui text-xs font-bold">{q.file.name}</p>
                {q.status === "error" ? (
                  <p className="font-ui text-xs font-bold text-coral-600">{q.error}</p>
                ) : (
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-tinta/10">
                    <div className="h-full rounded-full bg-turquesa transition-all" style={{ width: `${Math.round(q.progress * 100)}%` }} />
                  </div>
                )}
                <p className="mt-1 font-ui text-[11px] font-bold text-tinta-mute">
                  {q.status === "waiting" && "En espera"}
                  {q.status === "uploading" && (q.progress >= 1 ? "Procesando…" : `${Math.round(q.progress * 100)}%`)}
                  {q.status === "done" && "Listo ✓"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useFiltered(items: LibraryItem[]) {
  const [kind, setKind] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => items.filter((i) => (kind === "ALL" || i.kind === kind) && (!q || `${i.originalName} ${i.caption ?? ""}`.toLowerCase().includes(q.toLowerCase()))),
    [items, kind, q],
  );
  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      {(
        [
          ["ALL", "Todo"],
          ["IMAGE", "Fotos"],
          ["VIDEO", "Videos"],
        ] as const
      ).map(([k, l]) => (
        <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-full px-4 py-1.5 font-ui text-sm font-bold ${kind === k ? "bg-tinta text-papel" : "bg-tinta/5"}`}>
          {l}
        </button>
      ))}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o leyenda" className="field max-w-xs py-2" aria-label="Buscar" />
    </div>
  );
  return { filtered, controls };
}

export function MediaLibrary({ initial }: { initial: LibraryItem[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const { filtered, controls } = useFiltered(items);
  const router = useRouter();
  useEffect(() => setItems(initial), [initial]);
  return (
    <div className="space-y-8">
      <Uploader onUploaded={(m) => setItems((cur) => [m, ...cur])} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {controls}
        <p className="font-ui text-sm font-bold text-tinta-mute">{filtered.length} archivos</p>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-3xl bg-crema p-8 text-center text-tinta-soft">No hay archivos que coincidan.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setEditing(m)} className="group relative block w-full overflow-hidden rounded-2xl text-left">
                <Media media={m} className="aspect-square w-full transition group-hover:scale-105" sizes="240px" />
                <span className="absolute left-2 top-2 flex gap-1">
                  {m.kind === "VIDEO" && <span className="chip bg-tinta text-papel">Video</span>}
                  {m.usage > 0 && <span className="chip bg-papel/90">En {m.usage} {m.usage === 1 ? "recuerdo" : "recuerdos"}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <MediaEditor
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={(m) => setItems((cur) => cur.map((x) => (x.id === m.id ? m : x)))}
        onDeleted={(id) => {
          setItems((cur) => cur.filter((x) => x.id !== id));
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function MediaEditor({ item, onClose, onSaved, onDeleted }: { item: LibraryItem | null; onClose: () => void; onSaved: (m: LibraryItem) => void; onDeleted: (id: string) => void }) {
  const [caption, setCaption] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    setCaption(item?.caption ?? "");
    setAlt(item?.alt && item.alt !== "Recuerdo de Joaquín" ? item.alt : "");
  }, [item]);
  return (
    <AnimatePresence>
      {item && (
        <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-bosque-900/30" aria-label="Cerrar" onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true" initial={{ x: 80 }} animate={{ x: 0 }} exit={{ x: 80 }} className="relative h-full w-full max-w-md overflow-y-auto bg-papel p-6 shadow-lift">
            <Media media={item} className="aspect-[4/3] w-full rounded-2xl" sizes="440px" />
            <p className="mt-3 break-all font-ui text-xs font-bold text-tinta-mute">
              {item.originalName} · {(item.size / 1048576).toFixed(1)} MB{item.width ? ` · ${item.width}×${item.height}` : ""}
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="cap">
                  Leyenda (se muestra en la historia)
                </label>
                <input id="cap" className="field" value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="alt">
                  Descripción para lectores de pantalla
                </label>
                <textarea id="alt" className="field" rows={2} value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} placeholder="Ej.: Joaquín dormido sobre el pecho de papá" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn-candy"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const r = await updateMedia(item.id, { caption, alt });
                    setBusy(false);
                    if (r.ok) {
                      onSaved({ ...item, caption: caption || null, alt: alt || item.alt });
                      toast("Cambios guardados.");
                    } else toast(r.error ?? "No se pudo guardar.", "error");
                  }}
                >
                  Guardar
                </button>
                <a className="btn-soft" href={item.orig} target="_blank" rel="noreferrer">
                  Ver original
                </a>
                <ConfirmButton
                  onConfirm={async () => {
                    const r = await deleteMedia(item.id);
                    if (r.ok) {
                      toast("Archivo eliminado.");
                      onDeleted(item.id);
                    } else toast(r.error ?? "No se pudo eliminar.", "error");
                  }}
                >
                  Eliminar
                </ConfirmButton>
              </div>
              {item.usage > 0 && <p className="rounded-2xl bg-sol-100 p-3 font-ui text-sm font-bold">Se usa en {item.usage} {item.usage === 1 ? "recuerdo" : "recuerdos"}. Si la eliminas, desaparecerá de ahí también.</p>}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Selector de fotos/videos para formularios (con subida incluida). */
export function MediaPicker({
  open,
  onClose,
  library,
  onLibraryAdd,
  selected,
  onToggle,
  multiple = true,
  onlyImages = false,
}: {
  open: boolean;
  onClose: () => void;
  library: LibraryItem[];
  onLibraryAdd: (m: LibraryItem) => void;
  selected: string[];
  onToggle: (id: string) => void;
  multiple?: boolean;
  onlyImages?: boolean;
}) {
  const source = onlyImages ? library.filter((m) => m.kind === "IMAGE") : library;
  const { filtered, controls } = useFiltered(source);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-bosque-900/40" aria-label="Cerrar" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" initial={{ y: 40, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, opacity: 0 }} className="relative flex max-h-[92svh] w-full max-w-5xl flex-col rounded-[2rem] border-[3px] border-tinta bg-papel p-5 shadow-lift sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-3xl font-extrabold">{multiple ? "Elige las fotos y videos" : "Elige una foto"}</h2>
              <button type="button" className="btn-candy py-2" onClick={onClose}>
                Listo{multiple && selected.length ? ` (${selected.length})` : ""}
              </button>
            </div>
            <div className="mt-4">
              <Uploader compact onUploaded={(m) => { onLibraryAdd(m); onToggle(m.id); }} />
            </div>
            <div className="mt-4">{controls}</div>
            <ul className="mt-4 grid flex-1 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 lg:grid-cols-6">
              {filtered.map((m) => {
                const idx = selected.indexOf(m.id);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => onToggle(m.id)} aria-pressed={idx >= 0} className={`relative block w-full overflow-hidden rounded-2xl ring-4 transition ${idx >= 0 ? "ring-turquesa" : "ring-transparent hover:ring-tinta/10"}`}>
                      <Media media={m} className="aspect-square w-full" sizes="180px" />
                      {idx >= 0 && <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-turquesa font-ui text-sm font-bold text-papel">{multiple ? idx + 1 : "✓"}</span>}
                      {m.kind === "VIDEO" && <span className="chip absolute bottom-1.5 left-1.5 bg-tinta text-papel">Video</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
