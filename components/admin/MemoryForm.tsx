"use client";

import { AnimatePresence, motion, Reorder } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteMemory, saveMemory, type ActionResult } from "@/app/admin/actions";
import { Media } from "@/components/story/Media";
import type { LibraryItem } from "@/lib/admin-data";
import { PRESENTATION_LABELS, PRESENTATIONS, SCENE_META, SCENES, type PresentationId, type SceneId } from "@/lib/constants";
import { Footprint } from "@/components/ui/Watercolor";
import { MediaPicker, Uploader } from "./MediaLibrary";
import { ConfirmButton, FormMessage, Panel, useToast } from "./ui";
import { useFormStatus } from "react-dom";

export type MemoryFormValue = {
  id?: string;
  title: string;
  description: string;
  date: string;
  scene: SceneId | "";
  presentation: PresentationId;
  stageId: string;
  tags: string;
  status: "DRAFT" | "PUBLISHED";
  mediaIds: string[];
  coverId: string;
};

/** Miniatura que explica cada estilo de presentación */
export function StyleThumb({ id, color = "#21372B" }: { id: PresentationId; color?: string }) {
  const c = color;
  const box = (x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}) => <rect x={x} y={y} width={w} height={h} rx="3" fill={c} {...extra} />;
  const art: Record<PresentationId, React.ReactNode> = {
    AUTO: (
      <>
        <path d="M30 8l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#FFC93C" stroke={c} strokeWidth="1.5" />
      </>
    ),
    CINEMATIC: (
      <>
        {box(2, 2, 56, 36, { opacity: 0.25 })}
        {box(2, 2, 56, 6)}
        {box(2, 32, 56, 6)}
        {box(8, 24, 24, 3, { fill: "#fff" })}
      </>
    ),
    PARALLAX: (
      <>
        <circle cx="16" cy="18" r="12" fill="#BDECD3" />
        {box(10, 8, 28, 22, { opacity: 0.35 })}
        {box(32, 18, 24, 14, { fill: "#FFFCF5", stroke: c, strokeWidth: 1.5 })}
      </>
    ),
    ZOOM: (
      <>
        {box(2, 2, 56, 36, { opacity: 0.15 })}
        {box(16, 10, 28, 20, { opacity: 0.45 })}
        <path d="M10 6l6 4M50 6l-6 4M10 34l6-4M50 34l-6 4" stroke={c} strokeWidth="1.5" />
      </>
    ),
    EDITORIAL: (
      <>
        {box(4, 4, 34, 5)}
        {box(4, 13, 22, 23, { opacity: 0.35 })}
        {box(30, 13, 26, 2.5, { opacity: 0.4 })}
        {box(30, 18, 26, 2.5, { opacity: 0.4 })}
        {box(30, 23, 20, 2.5, { opacity: 0.4 })}
      </>
    ),
    OVERLAP: (
      <>
        <g transform="rotate(-12 20 20)">{box(8, 8, 20, 24, { fill: "#FFFCF5", stroke: c, strokeWidth: 1.5 })}</g>
        <g transform="rotate(10 40 20)">{box(30, 8, 20, 24, { fill: "#FFFCF5", stroke: c, strokeWidth: 1.5 })}</g>
        {box(20, 6, 20, 26, { fill: "#FFFCF5", stroke: c, strokeWidth: 1.5 })}
      </>
    ),
    COLLAGE: (
      <>
        {box(2, 2, 26, 22, { opacity: 0.5 })}
        {box(31, 2, 12, 10, { opacity: 0.3 })}
        {box(46, 2, 12, 22, { opacity: 0.4 })}
        {box(31, 14, 12, 10, { opacity: 0.25 })}
        {box(2, 27, 56, 11, { opacity: 0.3 })}
      </>
    ),
    SEQUENCE: (
      <>
        {box(4, 6, 16, 28, { opacity: 0.2 })}
        {box(22, 4, 18, 32, { opacity: 0.5 })}
        {box(42, 6, 14, 28, { opacity: 0.2 })}
        <path d="M20 38h4M28 38h4M36 38h4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    REVEAL: (
      <>
        {box(2, 2, 56, 36, { opacity: 0.12 })}
        {box(14, 10, 32, 20, { opacity: 0.5 })}
        <path d="M14 10l-8-6M46 10l8-6M14 30l-8 6M46 30l8 6" stroke={c} strokeWidth="1.5" strokeDasharray="2 2" />
      </>
    ),
    MASK: (
      <>
        {box(2, 2, 56, 36, { opacity: 0.12 })}
        <path d="M30 5c-8 0-13 12-13 20 0 7 6 12 13 12s13-5 13-12C43 17 38 5 30 5z" fill={c} opacity=".5" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 60 40" className="h-10 w-16" aria-hidden>
      {art[id]}
    </svg>
  );
}

function Step({ n, title, hint, children, color }: { n: number; title: string; hint?: string; children: React.ReactNode; color: string }) {
  return (
    <Panel>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-xl font-semibold text-papel" style={{ background: color }}>
          {n}
        </span>
        <div>
          <h2 className="font-heading text-2xl font-extrabold leading-tight">{title}</h2>
          {hint && <p className="font-ui text-sm font-semibold text-tinta-mute">{hint}</p>}
        </div>
      </div>
      {children}
    </Panel>
  );
}

function SaveButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-candy disabled:opacity-60">
      {pending ? "Guardando…" : label}
    </button>
  );
}

export function MemoryForm({ initial, library: lib, stages, justSaved = false }: { initial: MemoryFormValue; library: LibraryItem[]; stages: Array<{ id: string; name: string; color: string }>; justSaved?: boolean }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveMemory, { ok: false });
  const [library, setLibrary] = useState(lib);
  const [mediaIds, setMediaIds] = useState(initial.mediaIds);
  const [coverId, setCoverId] = useState(initial.coverId);
  const [presentation, setPresentation] = useState(initial.presentation);
  const [status, setStatus] = useState(initial.status);
  const [scene, setScene] = useState<SceneId | "">(initial.scene);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [saved, setSaved] = useState<{ id: string; scene: SceneId; published: boolean } | null>(
    justSaved && initial.id && initial.scene ? { id: initial.id, scene: initial.scene, published: initial.status === "PUBLISHED" } : null,
  );
  const router = useRouter();
  const toast = useToast();
  const handled = useRef(state);
  const stepOne = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.ok && state.id && scene) {
      toast(state.message ?? "Guardado.");
      setSaved({ id: state.id, scene, published: status === "PUBLISHED" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (!initial.id) router.replace(`/admin/recuerdos/${state.id}?guardado=1`);
      else router.refresh();
    }
  }, [state, initial.id, router, toast, scene, status]);

  const byId = new Map(library.map((m) => [m.id, m]));
  const selected = mediaIds.map((id) => byId.get(id)).filter(Boolean) as LibraryItem[];
  const accent = scene ? SCENE_META[scene].accent : "#2BA36B";
  const move = (id: string, d: number) =>
    setMediaIds((ids) => {
      const i = ids.indexOf(id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= ids.length) return ids;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!scene) {
          e.preventDefault();
          setSceneError(true);
          stepOne.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }}
      className="mx-auto max-w-3xl space-y-6 pb-28"
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {mediaIds.map((id) => (
        <input key={id} type="hidden" name="mediaIds" value={id} />
      ))}
      <input type="hidden" name="coverId" value={coverId} />
      <input type="hidden" name="presentation" value={presentation} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="scene" value={scene} />

      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="rounded-[1.8rem] border-[3px] border-tinta bg-menta p-5 shadow-soft">
            <p className="font-heading text-2xl font-extrabold">¡Listo! 🦕</p>
            <p className="mt-1 font-ui font-bold text-tinta-soft">
              {saved.published ? "El recuerdo ya se ve" : "Quedó como borrador"} en el capítulo «{SCENE_META[saved.scene].title}».
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/historia${saved.published ? "" : "?preview=1"}#recuerdo-${saved.id}`} className="btn-candy py-2.5 text-base">
                Verlo en la historia
              </Link>
              <Link href={`/admin/recuerdos/nuevo?capitulo=${saved.scene}`} className="btn-soft">
                Crear otro recuerdo
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={stepOne}>
        <Step n={1} title="¿En qué capítulo va?" hint="Es la parte de la historia donde aparecerá." color={accent}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Capítulo">
            {SCENES.filter((s) => s !== "CARTAS").map((s, i) => {
              const m = SCENE_META[s];
              const on = scene === s;
              return (
                <motion.button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setScene(s);
                    setSceneError(false);
                  }}
                  whileTap={{ scale: 0.96 }}
                  animate={on ? { scale: [1, 1.05, 1] } : {}}
                  className="relative flex flex-col items-start gap-1 rounded-2xl border-[3px] p-3 text-left transition"
                  style={{ borderColor: on ? m.accent : "rgba(33,55,43,.08)", background: on ? `${m.accent}1f` : m.wash }}
                >
                  <Footprint className="h-6 w-6" color={m.accent} style={{ rotate: `${i % 2 ? 14 : -14}deg` }} />
                  <span className="font-ui text-[11px] font-bold uppercase tracking-widest text-tinta-mute">{m.chapter}</span>
                  <span className="font-heading text-lg font-extrabold leading-tight">{m.title}</span>
                  {on && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full font-bold text-papel" style={{ background: m.accent }}>✓</span>}
                </motion.button>
              );
            })}
          </div>
          {sceneError && <p className="mt-3 rounded-2xl bg-coral-100 px-4 py-2 font-ui text-sm font-bold text-coral-600">Elige el capítulo donde va este recuerdo.</p>}
        </Step>
      </div>

      <Step n={2} title="Fotos y videos" hint="Arrástralas aquí o tócalas para elegirlas desde el celular. Se agregan solas al recuerdo." color={accent}>
        <Uploader
          compact
          title="Arrastra aquí las fotos y videos de este recuerdo"
          onBusyChange={setUploading}
          onUploaded={(m) => {
            setLibrary((l) => [m, ...l]);
            setMediaIds((ids) => (ids.includes(m.id) ? ids : [...ids, m.id]));
          }}
        />
        <button type="button" className="mt-3 font-ui text-sm font-bold text-turquesa underline decoration-2 underline-offset-4" onClick={() => setPicker(true)}>
          O elige de las que ya están en la biblioteca
        </button>
        {selected.length > 0 && (
          <div className="mt-5">
            <p className="label">En este recuerdo ({selected.length}) · la ★ es la foto principal · arrastra o usa las flechas para ordenar</p>
            <Reorder.Group axis="y" values={mediaIds} onReorder={setMediaIds} className="space-y-2">
              {selected.map((m, i) => (
                <Reorder.Item key={m.id} value={m.id} className="flex cursor-grab items-center gap-3 rounded-2xl border-2 border-tinta/10 bg-white p-2 active:cursor-grabbing">
                  <Media media={m} className="h-20 w-20 shrink-0 rounded-xl" sizes="100px" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-sm font-bold">{m.caption || m.originalName}</p>
                    <p className="font-ui text-xs font-semibold text-tinta-mute">{m.kind === "VIDEO" ? "Video" : "Foto"} {i + 1}</p>
                  </div>
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(m.id, -1)} disabled={i === 0} className="h-7 w-8 rounded-lg font-bold disabled:opacity-20 hover:bg-tinta/5" aria-label="Subir">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(m.id, 1)} disabled={i === selected.length - 1} className="h-7 w-8 rounded-lg font-bold disabled:opacity-20 hover:bg-tinta/5" aria-label="Bajar">
                      ↓
                    </button>
                  </div>
                  <button type="button" onClick={() => setCoverId(m.id)} aria-pressed={coverId === m.id} aria-label="Usar como foto principal" className={`grid h-10 w-10 place-items-center rounded-full text-xl ${coverId === m.id || (!coverId && mediaIds[0] === m.id) ? "bg-sol" : "bg-tinta/5"}`}>
                    ★
                  </button>
                  <button type="button" onClick={() => setMediaIds((ids) => ids.filter((x) => x !== m.id))} className="rounded-full px-2 py-2 font-ui text-sm font-bold text-coral-600 hover:bg-coral-100" aria-label="Quitar del recuerdo">
                    ✕
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </Step>

      <Step n={3} title="Cuéntalo" color={accent}>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="title">
              Título
            </label>
            <input id="title" name="title" required maxLength={140} defaultValue={initial.title} className="field font-heading text-2xl font-bold" placeholder="El día que papá se enteró" />
          </div>
          <div>
            <label className="label" htmlFor="description">
              ¿Qué pasó? (opcional)
            </label>
            <textarea id="description" name="description" rows={4} maxLength={4000} defaultValue={initial.description} className="field" placeholder="¿Quién estaba? ¿Qué sentimos?" />
          </div>
          <div className="max-w-xs">
            <label className="label" htmlFor="date">
              Fecha (opcional, sirve para ordenar)
            </label>
            <input id="date" name="date" type="date" defaultValue={initial.date} className="field" />
          </div>
        </div>
      </Step>

      <details className="group rounded-[1.8rem] border-2 border-tinta/10 bg-papel p-5 shadow-soft sm:p-6">
        <summary className="cursor-pointer list-none font-heading text-xl font-extrabold">
          <span className="inline-block transition group-open:rotate-90">›</span> Más opciones <span className="font-ui text-sm font-semibold text-tinta-mute">(estilo, edad, etiquetas)</span>
        </summary>
        <div className="mt-5 space-y-5">
          <div>
            <p className="label">Cómo se verá en la historia</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESENTATIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPresentation(p)}
                  aria-pressed={presentation === p}
                  className="flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition"
                  style={{ borderColor: presentation === p ? accent : "rgba(33,55,43,.1)", background: presentation === p ? `${accent}18` : undefined }}
                >
                  <StyleThumb id={p} />
                  <span className="font-heading text-base font-bold leading-tight">{PRESENTATION_LABELS[p].name}</span>
                  <span className="font-ui text-[11px] font-semibold leading-snug text-tinta-mute">{PRESENTATION_LABELS[p].hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="stageId">
                Edad o etapa (opcional)
              </label>
              <select id="stageId" name="stageId" defaultValue={initial.stageId} className="field">
                <option value="">Sin etapa</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tags">
                Etiquetas (separadas por comas)
              </label>
              <input id="tags" name="tags" defaultValue={initial.tags} className="field" placeholder="abuelos, risas" />
            </div>
          </div>
          {initial.id && (
            <div className="border-t-2 border-tinta/5 pt-3">
              <ConfirmButton
                onConfirm={async () => {
                  const r = await deleteMemory(initial.id!);
                  if (r.ok) {
                    toast("Recuerdo eliminado. Las fotos siguen en la biblioteca.");
                    router.push("/admin/recuerdos");
                  } else toast(r.error ?? "No se pudo eliminar.", "error");
                }}
              >
                Eliminar este recuerdo
              </ConfirmButton>
            </div>
          )}
        </div>
      </details>

      <FormMessage state={{ ...state, message: undefined }} />

      {/* barra fija para guardar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-tinta/10 bg-papel/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-tinta/5 p-1" role="radiogroup" aria-label="Estado">
            {(
              [
                ["DRAFT", "Borrador"],
                ["PUBLISHED", "Publicar"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={status === v} onClick={() => setStatus(v)} className={`rounded-full px-4 py-2 font-ui text-sm font-bold transition ${status === v ? "bg-papel shadow-soft" : "text-tinta-mute"}`}>
                {l}
              </button>
            ))}
          </div>
          <SaveButton label={uploading ? "Esperando que terminen de subir…" : status === "PUBLISHED" ? "Guardar y publicar" : "Guardar borrador"} disabled={uploading} />
          {initial.id && (
            <Link href={`/historia?preview=1#recuerdo-${initial.id}`} target="_blank" className="font-ui text-sm font-bold text-turquesa underline decoration-2 underline-offset-4">
              Vista previa
            </Link>
          )}
        </div>
      </div>

      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        library={library}
        onLibraryAdd={(m) => setLibrary((l) => [m, ...l])}
        selected={mediaIds}
        onToggle={(id) => setMediaIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
      />
    </form>
  );
}
