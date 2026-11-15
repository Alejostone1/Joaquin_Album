"use client";

import { motion, Reorder } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteMemory, saveMemory, type ActionResult } from "@/app/admin/actions";
import { Media } from "@/components/story/Media";
import type { LibraryItem } from "@/lib/admin-data";
import { PRESENTATION_LABELS, PRESENTATIONS, SCENE_META, SCENES, type PresentationId, type SceneId } from "@/lib/constants";
import { MediaPicker } from "./MediaLibrary";
import { ConfirmButton, FormMessage, Panel, SubmitButton, useToast } from "./ui";

export type MemoryFormValue = {
  id?: string;
  title: string;
  description: string;
  date: string;
  scene: SceneId;
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

export function MemoryForm({ initial, library: lib, stages }: { initial: MemoryFormValue; library: LibraryItem[]; stages: Array<{ id: string; name: string; color: string }> }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveMemory, { ok: false });
  const [library, setLibrary] = useState(lib);
  const [mediaIds, setMediaIds] = useState(initial.mediaIds);
  const [coverId, setCoverId] = useState(initial.coverId);
  const [presentation, setPresentation] = useState(initial.presentation);
  const [status, setStatus] = useState(initial.status);
  const [scene, setScene] = useState(initial.scene);
  const [picker, setPicker] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.ok) {
      toast(state.message ?? "Guardado.");
      if (!initial.id && state.id) router.replace(`/admin/recuerdos/${state.id}`);
      else router.refresh();
    }
  }, [state, initial.id, router, toast]);

  const byId = new Map(library.map((m) => [m.id, m]));
  const selected = mediaIds.map((id) => byId.get(id)).filter(Boolean) as LibraryItem[];
  const accent = SCENE_META[scene].accent;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {mediaIds.map((id) => (
        <input key={id} type="hidden" name="mediaIds" value={id} />
      ))}
      <input type="hidden" name="coverId" value={coverId} />
      <input type="hidden" name="presentation" value={presentation} />
      <input type="hidden" name="status" value={status} />

      <div className="space-y-6">
        <Panel>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="title">
                Título
              </label>
              <input id="title" name="title" required maxLength={140} defaultValue={initial.title} className="field font-heading text-2xl font-bold" placeholder="Su primer baño" />
            </div>
            <div>
              <label className="label" htmlFor="description">
                Cuéntalo
              </label>
              <textarea id="description" name="description" rows={4} maxLength={4000} defaultValue={initial.description} className="field" placeholder="¿Qué pasó? ¿Quién estaba? ¿Qué sentimos?" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="date">
                  Fecha
                </label>
                <input id="date" name="date" type="date" defaultValue={initial.date} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="scene">
                  Capítulo
                </label>
                <select id="scene" name="scene" value={scene} onChange={(e) => setScene(e.target.value as SceneId)} className="field">
                  {SCENES.filter((s) => s !== "CARTAS").map((s) => (
                    <option key={s} value={s}>
                      {SCENE_META[s].title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="stageId">
                  Etapa
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
            </div>
            <div>
              <label className="label" htmlFor="tags">
                Etiquetas (separadas por comas)
              </label>
              <input id="tags" name="tags" defaultValue={initial.tags} className="field" placeholder="baño, abuelos, risas" />
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl font-extrabold">Fotos y videos</h2>
              <p className="font-ui text-sm font-semibold text-tinta-mute">Arrastra para ordenar. La estrella marca la foto principal.</p>
            </div>
            <button type="button" className="btn-soft" onClick={() => setPicker(true)}>
              {selected.length ? "Agregar o quitar" : "Elegir fotos y videos"}
            </button>
          </div>
          {selected.length === 0 ? (
            <button type="button" onClick={() => setPicker(true)} className="w-full rounded-3xl border-[3px] border-dashed border-tinta/15 p-10 text-center font-heading text-lg font-bold text-tinta-mute hover:bg-crema">
              Todavía no hay fotos en este recuerdo
            </button>
          ) : (
            <Reorder.Group axis="y" values={mediaIds} onReorder={setMediaIds} className="space-y-2">
              {selected.map((m) => (
                <Reorder.Item key={m.id} value={m.id} className="flex cursor-grab items-center gap-3 rounded-2xl border-2 border-tinta/10 bg-white p-2 active:cursor-grabbing">
                  <Media media={m} className="h-16 w-16 shrink-0 rounded-xl" sizes="80px" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-sm font-bold">{m.caption || m.originalName}</p>
                    <p className="font-ui text-xs font-semibold text-tinta-mute">{m.kind === "VIDEO" ? "Video" : "Foto"}</p>
                  </div>
                  <button type="button" onClick={() => setCoverId(m.id)} aria-pressed={coverId === m.id} aria-label="Usar como foto principal" className={`grid h-10 w-10 place-items-center rounded-full text-xl ${coverId === m.id || (!coverId && mediaIds[0] === m.id) ? "bg-sol" : "bg-tinta/5"}`}>
                    ★
                  </button>
                  <button type="button" onClick={() => setMediaIds((ids) => ids.filter((x) => x !== m.id))} className="rounded-full px-3 py-2 font-ui text-sm font-bold text-coral-600 hover:bg-coral-100">
                    Quitar
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel>
          <h2 className="font-heading text-2xl font-extrabold">Cómo se verá</h2>
          <p className="font-ui text-sm font-semibold text-tinta-mute">Cada recuerdo puede tener su propio estilo.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
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
        </Panel>
        <Panel className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-tinta/5 p-1" role="radiogroup" aria-label="Estado">
            {(
              [
                ["DRAFT", "Borrador"],
                ["PUBLISHED", "Publicado"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={status === v} onClick={() => setStatus(v)} className={`rounded-full py-2 font-ui text-sm font-bold transition ${status === v ? "bg-papel shadow-soft" : "text-tinta-mute"}`}>
                {l}
              </button>
            ))}
          </div>
          <p className="font-ui text-xs font-semibold text-tinta-mute">{status === "DRAFT" ? "Sólo los editores lo verán en la vista previa." : "Toda la familia lo verá en la historia."}</p>
          <FormMessage state={state} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton>{status === "PUBLISHED" ? "Guardar y publicar" : "Guardar borrador"}</SubmitButton>
            {initial.id && (
              <Link href={`/historia?preview=1#recuerdo-${initial.id}`} target="_blank" className="btn-soft">
                Vista previa
              </Link>
            )}
          </div>
          {initial.id && (
            <motion.div layout className="border-t-2 border-tinta/5 pt-3">
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
            </motion.div>
          )}
        </Panel>
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
