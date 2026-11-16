"use client";

import { AnimatePresence, motion, Reorder } from "framer-motion";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  changeOwnPassword,
  createInviteLink,
  createUser,
  deleteChapter,
  saveChapter,
  deleteLetter,
  deleteMilestone,
  deleteStage,
  deleteUser,
  reorderStages,
  resetUserPassword,
  saveBirth,
  saveLetterAdmin,
  saveMilestone,
  saveScene,
  saveStage,
  updateUser,
  type ActionResult,
} from "@/app/admin/actions";
import { MilestoneIcon } from "@/components/story/icons";
import { Media } from "@/components/story/Media";
import type { LibraryItem } from "@/lib/admin-data";
import { MILESTONE_LABELS, MILESTONE_TYPES, ROLE_LABELS, SCENE_META, type MilestoneTypeId, type RoleId, type SceneId } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { MediaPicker } from "./MediaLibrary";
import { ConfirmButton, FormMessage, Panel, StatusBadge, SubmitButton, useToast } from "./ui";

/** Ejecuta un efecto una sola vez por cada respuesta nueva de una acción. */
function useOnResult(state: ActionResult, fn: (s: ActionResult) => void) {
  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    fn(state);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
}

function PhotoField({ name, value, onChange, library, setLibrary, label }: { name: string; value: string; onChange: (v: string) => void; library: LibraryItem[]; setLibrary: (fn: (l: LibraryItem[]) => LibraryItem[]) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const item = library.find((m) => m.id === value);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        {item ? <Media media={item} className="h-20 w-20 rounded-2xl" sizes="100px" /> : <div className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-dashed border-tinta/15 font-ui text-xs font-bold text-tinta-mute">Sin foto</div>}
        <div className="flex flex-col items-start gap-1">
          <button type="button" className="btn-soft py-2" onClick={() => setOpen(true)}>
            {item ? "Cambiar" : "Elegir foto"}
          </button>
          {item && (
            <button type="button" className="px-2 font-ui text-xs font-bold text-coral-600" onClick={() => onChange("")}>
              Quitar
            </button>
          )}
        </div>
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        library={library}
        onLibraryAdd={(m) => setLibrary((l) => [m, ...l])}
        selected={value ? [value] : []}
        multiple={false}
        onToggle={(id) => {
          onChange(id === value ? "" : id);
          setOpen(false);
        }}
      />
    </div>
  );
}

// ——— Línea de tiempo ———
export type MilestoneRow = { id: string; type: MilestoneTypeId; title: string; description: string | null; date: string; status: "DRAFT" | "PUBLISHED"; mediaId: string | null; stageId: string | null };

export function MilestoneManager({ rows, library: lib, stages }: { rows: MilestoneRow[]; library: LibraryItem[]; stages: Array<{ id: string; name: string }> }) {
  const [editing, setEditing] = useState<MilestoneRow | "new" | null>(null);
  const [library, setLibrary] = useState(lib);
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-2">
        <button className="btn-candy mb-3" onClick={() => setEditing("new")}>
          Agregar un momento
        </button>
        {rows.length === 0 && <p className="rounded-3xl bg-crema p-6 text-tinta-soft">Aún no hay momentos. Agrega el primero: su primer mes, su primera sonrisa…</p>}
        {rows.map((r) => {
          const meta = MILESTONE_LABELS[r.type];
          const media = library.find((m) => m.id === r.mediaId);
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border-2 border-tinta/10 bg-papel p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-papel" style={{ background: meta.color }}>
                <MilestoneIcon type={r.type} />
              </span>
              {media && <Media media={media} className="h-12 w-12 shrink-0 rounded-xl" sizes="60px" />}
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(r)}>
                <p className="truncate font-heading text-lg font-bold">{r.title}</p>
                <p className="font-ui text-xs font-bold text-tinta-mute">
                  {formatDate(r.date)} · {meta.name}
                </p>
              </button>
              <StatusBadge status={r.status} />
              <ConfirmButton
                onConfirm={async () => {
                  const res = await deleteMilestone(r.id);
                  toast(res.ok ? "Momento eliminado." : res.error ?? "Error", res.ok ? "ok" : "error");
                  router.refresh();
                }}
              >
                Eliminar
              </ConfirmButton>
            </div>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {editing && (
          <motion.div key={editing === "new" ? "new" : editing.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <MilestoneForm row={editing === "new" ? null : editing} library={library} setLibrary={setLibrary} stages={stages} onDone={() => setEditing(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MilestoneForm({ row, library, setLibrary, stages, onDone }: { row: MilestoneRow | null; library: LibraryItem[]; setLibrary: (fn: (l: LibraryItem[]) => LibraryItem[]) => void; stages: Array<{ id: string; name: string }>; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveMilestone, { ok: false });
  const [type, setType] = useState<MilestoneTypeId>(row?.type ?? "MES");
  const [mediaId, setMediaId] = useState(row?.mediaId ?? "");
  const toast = useToast();
  const router = useRouter();
  useOnResult(state, (s) => {
    if (s.ok) {
      toast(s.message ?? "Guardado.");
      router.refresh();
      onDone();
    }
  });
  return (
    <Panel className="sticky top-6">
      <form action={action} className="space-y-4">
        <h2 className="font-heading text-2xl font-extrabold">{row ? "Editar momento" : "Nuevo momento"}</h2>
        {row && <input type="hidden" name="id" value={row.id} />}
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-2">
          {MILESTONE_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t} className="flex items-center gap-2 rounded-2xl border-2 px-3 py-2 font-ui text-sm font-bold" style={{ borderColor: type === t ? MILESTONE_LABELS[t].color : "rgba(33,55,43,.1)", background: type === t ? `${MILESTONE_LABELS[t].color}22` : undefined }}>
              <span style={{ color: MILESTONE_LABELS[t].color }}>
                <MilestoneIcon type={t} className="h-4 w-4" />
              </span>
              {MILESTONE_LABELS[t].name}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="m-title">
            Título
          </label>
          <input id="m-title" name="title" required defaultValue={row?.title} className="field" placeholder="Dijo “mamá” por primera vez" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="m-date">
              Fecha
            </label>
            <input id="m-date" name="date" type="date" required defaultValue={row?.date} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="m-stage">
              Etapa
            </label>
            <select id="m-stage" name="stageId" defaultValue={row?.stageId ?? ""} className="field">
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
          <label className="label" htmlFor="m-desc">
            Detalles
          </label>
          <textarea id="m-desc" name="description" rows={3} defaultValue={row?.description ?? ""} className="field" />
        </div>
        <PhotoField name="mediaId" value={mediaId} onChange={setMediaId} library={library} setLibrary={setLibrary} label="Foto (opcional)" />
        <div>
          <label className="label" htmlFor="m-status">
            Estado
          </label>
          <select id="m-status" name="status" defaultValue={row?.status ?? "PUBLISHED"} className="field">
            <option value="PUBLISHED">Publicado</option>
            <option value="DRAFT">Borrador</option>
          </select>
        </div>
        <FormMessage state={state} />
        <div className="flex gap-2">
          <SubmitButton>Guardar momento</SubmitButton>
          <button type="button" className="btn-soft" onClick={onDone}>
            Cancelar
          </button>
        </div>
      </form>
    </Panel>
  );
}

// ——— Etapas ———
type StageRow = { id: string; name: string; description: string | null; color: string };

export function StageManager({ rows }: { rows: StageRow[] }) {
  const [list, setList] = useState(rows);
  const [editing, setEditing] = useState<StageRow | "new" | null>(null);
  const toast = useToast();
  const router = useRouter();
  const latest = useRef(list);
  latest.current = list;
  useEffect(() => setList(rows), [rows]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        <button className="btn-candy mb-4" onClick={() => setEditing("new")}>
          Nueva etapa
        </button>
        <Reorder.Group axis="y" values={list} onReorder={setList} className="space-y-2">
          {list.map((s) => (
            <Reorder.Item
              key={s.id}
              value={s}
              onDragEnd={async () => {
                await new Promise((r) => setTimeout(r, 30));
                const r = await reorderStages(latest.current.map((x) => x.id));
                toast(r.ok ? "Orden guardado." : r.error ?? "Error", r.ok ? "ok" : "error");
              }}
              className="flex cursor-grab items-center gap-3 rounded-2xl border-2 border-tinta/10 bg-papel p-3"
            >
              <span className="h-10 w-10 shrink-0 rounded-full border-[3px] border-papel shadow-soft" style={{ background: s.color }} />
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(s)}>
                <p className="font-heading text-lg font-bold">{s.name}</p>
                {s.description && <p className="truncate font-ui text-xs font-semibold text-tinta-mute">{s.description}</p>}
              </button>
              <ConfirmButton
                onConfirm={async () => {
                  const r = await deleteStage(s.id);
                  toast(r.ok ? "Etapa eliminada." : r.error ?? "Error", r.ok ? "ok" : "error");
                  router.refresh();
                }}
              >
                Eliminar
              </ConfirmButton>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
      {editing && <StageForm key={editing === "new" ? "new" : editing.id} row={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
    </div>
  );
}

function StageForm({ row, onDone }: { row: StageRow | null; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveStage, { ok: false });
  const toast = useToast();
  const router = useRouter();
  const palette = ["#A8C3A0", "#2BA36B", "#1FB5B0", "#3C9BE0", "#F2A516", "#FF8A7A", "#E86A9A", "#FF9F68", "#9B7BE0"];
  const [color, setColor] = useState(row?.color ?? palette[0]);
  useOnResult(state, (s) => {
    if (s.ok) {
      toast(s.message ?? "Guardado.");
      router.refresh();
      onDone();
    }
  });
  return (
    <Panel>
      <form action={action} className="space-y-4">
        <h2 className="font-heading text-2xl font-extrabold">{row ? "Editar etapa" : "Nueva etapa"}</h2>
        {row && <input type="hidden" name="id" value={row.id} />}
        {row && <input type="hidden" name="hasEnabled" value="1" />}
        <input type="hidden" name="color" value={color} />
        <div>
          <label className="label" htmlFor="s-name">
            Nombre
          </label>
          <input id="s-name" name="name" required defaultValue={row?.name} className="field" placeholder="Primer año" />
        </div>
        <div>
          <label className="label" htmlFor="s-desc">
            Descripción
          </label>
          <input id="s-desc" name="description" defaultValue={row?.description ?? ""} className="field" />
        </div>
        <div>
          <p className="label">Color</p>
          <div className="flex flex-wrap gap-2">
            {palette.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} aria-pressed={color === c} className={`h-9 w-9 rounded-full border-[3px] transition ${color === c ? "scale-110 border-tinta" : "border-papel"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <FormMessage state={state} />
        <div className="flex gap-2">
          <SubmitButton>Guardar</SubmitButton>
          <button type="button" className="btn-soft" onClick={onDone}>
            Cancelar
          </button>
        </div>
      </form>
    </Panel>
  );
}

// ——— Cartas ———
type LetterRow = { id: string; authorName: string; relation: string | null; body: string; openAt: string | null; status: "DRAFT" | "PUBLISHED"; createdAt: string };

export function LetterManager({ rows }: { rows: LetterRow[] }) {
  const [editing, setEditing] = useState<LetterRow | null>(null);
  const toast = useToast();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
      <div className="space-y-2">
        {rows.length === 0 && <p className="rounded-3xl bg-crema p-6 text-tinta-soft">Todavía no hay cartas. La familia puede escribirlas desde el capítulo “Cartas para mi futuro”.</p>}
        {rows.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-2xl border-2 border-tinta/10 bg-papel p-4">
            <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(l)}>
              <p className="font-heading text-lg font-bold">
                De {l.authorName}
                {l.relation ? ` · ${l.relation}` : ""}
              </p>
              <p className="truncate font-ui text-sm text-tinta-soft">{l.body}</p>
              <p className="mt-1 font-ui text-xs font-bold text-tinta-mute">
                Escrita el {formatDate(l.createdAt.slice(0, 10))}
                {l.openAt ? (l.openAt > today ? ` · sellada hasta el ${formatDate(l.openAt)}` : ` · se abrió el ${formatDate(l.openAt)}`) : ""}
              </p>
            </button>
            <StatusBadge status={l.status} />
            <ConfirmButton
              onConfirm={async () => {
                const r = await deleteLetter(l.id);
                toast(r.ok ? "Carta eliminada." : r.error ?? "Error", r.ok ? "ok" : "error");
                router.refresh();
              }}
            >
              Eliminar
            </ConfirmButton>
          </div>
        ))}
      </div>
      {editing && <LetterForm key={editing.id} row={editing} onDone={() => setEditing(null)} />}
    </div>
  );
}

function LetterForm({ row, onDone }: { row: LetterRow; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveLetterAdmin, { ok: false });
  const toast = useToast();
  const router = useRouter();
  useOnResult(state, (s) => {
    if (s.ok) {
      toast(s.message ?? "Guardado.");
      router.refresh();
      onDone();
    }
  });
  return (
    <Panel>
      <form action={action} className="space-y-4">
        <h2 className="font-heading text-2xl font-extrabold">Editar carta</h2>
        <input type="hidden" name="id" value={row.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="l-a">
              Firma
            </label>
            <input id="l-a" name="authorName" defaultValue={row.authorName} className="field" required />
          </div>
          <div>
            <label className="label" htmlFor="l-r">
              Relación
            </label>
            <input id="l-r" name="relation" defaultValue={row.relation ?? ""} className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="l-b">
            Carta
          </label>
          <textarea id="l-b" name="body" rows={9} defaultValue={row.body} className="field font-heading" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="l-o">
              Sellada hasta (opcional)
            </label>
            <input id="l-o" name="openAt" type="date" defaultValue={row.openAt ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="l-s">
              Estado
            </label>
            <select id="l-s" name="status" defaultValue={row.status} className="field">
              <option value="PUBLISHED">Visible</option>
              <option value="DRAFT">Oculta</option>
            </select>
          </div>
        </div>
        <FormMessage state={state} />
        <div className="flex gap-2">
          <SubmitButton>Guardar</SubmitButton>
          <button type="button" className="btn-soft" onClick={onDone}>
            Cerrar
          </button>
        </div>
      </form>
    </Panel>
  );
}

// ——— Nacimiento ———
export type BirthRow = { birthDate: string; birthTime: string; weight: string; height: string; place: string; firstMeeting: string; note: string; mainPhotoId: string };

export function BirthForm({ row, library: lib }: { row: BirthRow; library: LibraryItem[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveBirth, { ok: false });
  const [library, setLibrary] = useState(lib);
  const [photo, setPhoto] = useState(row.mainPhotoId);
  const toast = useToast();
  const router = useRouter();
  useOnResult(state, (s) => {
    if (s.ok) {
      toast(s.message ?? "Guardado.");
      router.refresh();
    }
  });
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Panel className="space-y-4">
        <p className="rounded-2xl bg-rosa-100 p-4 font-ui text-sm font-bold">Todos los datos son opcionales. Lo que dejes vacío aparecerá como “Pronto” en la historia, nunca se inventa.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="b-d">
              Fecha de nacimiento
            </label>
            <input id="b-d" name="birthDate" type="date" defaultValue={row.birthDate} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="b-t">
              Hora
            </label>
            <input id="b-t" name="birthTime" type="time" defaultValue={row.birthTime} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="b-w">
              Peso
            </label>
            <input id="b-w" name="weight" defaultValue={row.weight} className="field" placeholder="Ej.: 3,2 kg" />
          </div>
          <div>
            <label className="label" htmlFor="b-h">
              Estatura
            </label>
            <input id="b-h" name="height" defaultValue={row.height} className="field" placeholder="Ej.: 50 cm" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="b-p">
            Lugar
          </label>
          <input id="b-p" name="place" defaultValue={row.place} className="field" placeholder="Ciudad o clínica" />
        </div>
        <div>
          <label className="label" htmlFor="b-f">
            El primer encuentro
          </label>
          <textarea id="b-f" name="firstMeeting" rows={4} defaultValue={row.firstMeeting} className="field" placeholder="Lo que sentimos cuando lo vimos por primera vez…" />
        </div>
        <div>
          <label className="label" htmlFor="b-n">
            Nota adicional
          </label>
          <textarea id="b-n" name="note" rows={3} defaultValue={row.note} className="field" />
        </div>
        <FormMessage state={state} />
        <SubmitButton>Guardar datos</SubmitButton>
      </Panel>
      <Panel>
        <PhotoField name="mainPhotoId" value={photo} onChange={setPhoto} library={library} setLibrary={setLibrary} label="Fotografía principal" />
        <p className="mt-3 font-ui text-xs font-semibold text-tinta-mute">Las demás fotos del día crea recuerdos en el capítulo “El día que llegaste”.</p>
      </Panel>
    </form>
  );
}

// ——— Capítulos ———
type SceneRow = { scene: SceneId; title: string; subtitle: string | null; phrase: string | null; enabled: boolean };

export function SceneManager({ rows }: { rows: SceneRow[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((r) => (
        <SceneCard key={r.scene} row={r} />
      ))}
    </div>
  );
}

function SceneCard({ row }: { row: SceneRow }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveScene, { ok: false });
  const toast = useToast();
  useOnResult(state, (s) => s.ok && toast(s.message ?? "Guardado."));
  const meta = SCENE_META[row.scene];
  return (
    <Panel>
      <form action={action} className="space-y-3">
        <input type="hidden" name="scene" value={row.scene} />
        <div className="flex items-center justify-between gap-3">
          <p className="font-ui text-xs font-bold uppercase tracking-widest" style={{ color: meta.accent }}>
            {meta.chapter}
          </p>
          <label className="flex cursor-pointer items-center gap-2 font-ui text-sm font-bold">
            <input type="checkbox" name="enabled" defaultChecked={row.enabled} className="h-5 w-5 accent-esmeralda" />
            Visible
          </label>
        </div>
        <input name="title" defaultValue={row.title} className="field font-heading text-xl font-bold" aria-label="Título" required />
        <input name="subtitle" defaultValue={row.subtitle ?? ""} className="field" aria-label="Etiqueta" placeholder="Capítulo 1" />
        <textarea name="phrase" defaultValue={row.phrase ?? ""} rows={2} className="field" aria-label="Frase" placeholder="Frase del capítulo" />
        <FormMessage state={{ ...state, message: undefined }} />
        <SubmitButton className="btn-soft">Guardar</SubmitButton>
      </form>
    </Panel>
  );
}

// ——— Capítulos de la familia ———
type CustomRow = { id: string; title: string; subtitle: string | null; phrase: string | null; color: string; companion: string; afterScene: SceneId; enabled: boolean; count: number };
const CH_COLORS = ["#9B7BE0", "#2BA36B", "#FF8A7A", "#1FB5B0", "#F2A516", "#E86A9A", "#3C9BE0", "#FF9F68", "#7FB86F"];
const DINOS = [
  ["stego", "Estegosaurio"],
  ["trice", "Triceratops"],
  ["ptero", "Pterodáctilo"],
  ["baby", "Huevito"],
] as const;

export function CustomChapterManager({ rows }: { rows: CustomRow[] }) {
  const [adding, setAdding] = useState(rows.length === 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <CustomChapterCard key={r.id} row={r} />
        ))}
        {adding ? (
          <CustomChapterCard onDone={() => setAdding(false)} />
        ) : (
          <button onClick={() => setAdding(true)} className="grid min-h-[12rem] place-items-center rounded-[1.8rem] border-[3px] border-dashed border-tinta/20 font-heading text-2xl font-extrabold text-tinta-soft transition hover:border-tinta/40 hover:bg-white">
            + Crear un capítulo nuevo
          </button>
        )}
      </div>
    </div>
  );
}

function CustomChapterCard({ row, onDone }: { row?: CustomRow; onDone?: () => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveChapter, { ok: false });
  const toast = useToast();
  const router = useRouter();
  const [color, setColor] = useState(row?.color ?? CH_COLORS[0]);
  const formRef = useRef<HTMLFormElement>(null);
  useOnResult(state, (s) => {
    if (!s.ok) return;
    toast(s.message ?? "Guardado.");
    if (!row) {
      formRef.current?.reset();
      onDone?.();
    }
    router.refresh();
  });
  return (
    <Panel>
      <form ref={formRef} action={action} className="space-y-3" style={{ borderColor: color }}>
        {row && <input type="hidden" name="id" value={row.id} />}
        {row && <input type="hidden" name="hasEnabled" value="1" />}
        <input type="hidden" name="color" value={color} />
        <div className="flex items-center justify-between gap-3">
          <p className="font-ui text-xs font-bold uppercase tracking-widest" style={{ color }}>
            {row ? `Capítulo de la familia · ${row.count} ${row.count === 1 ? "recuerdo" : "recuerdos"}` : "Nuevo capítulo"}
          </p>
          {row && (
            <label className="flex cursor-pointer items-center gap-2 font-ui text-sm font-bold">
              <input type="checkbox" name="enabled" defaultChecked={row.enabled} className="h-5 w-5 accent-esmeralda" />
              Visible
            </label>
          )}
        </div>
        <input name="title" defaultValue={row?.title} className="field font-heading text-xl font-bold" aria-label="Título" placeholder="Ej.: Mi primera Navidad" required />
        <input name="subtitle" defaultValue={row?.subtitle ?? ""} className="field" aria-label="Etiqueta" placeholder="Etiqueta (ej.: Diciembre 2026)" />
        <textarea name="phrase" defaultValue={row?.phrase ?? ""} rows={2} className="field" aria-label="Frase" placeholder="Una frase bonita para abrir el capítulo" />
        <div className="flex flex-wrap gap-2">
          {CH_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c} className={`h-9 w-9 rounded-full border-[3px] transition ${color === c ? "scale-110 border-tinta" : "border-white"}`} style={{ background: c }} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-ui text-sm font-bold">
            Aparece después de
            <select name="afterScene" defaultValue={row?.afterScene ?? "AVENTURAS"} className="field mt-1">
              {(Object.keys(SCENE_META) as SceneId[]).map((s) => (
                <option key={s} value={s}>
                  {SCENE_META[s].title}
                </option>
              ))}
            </select>
          </label>
          <label className="font-ui text-sm font-bold">
            Dinosaurio que lo acompaña
            <select name="companion" defaultValue={row?.companion ?? "stego"} className="field mt-1">
              {DINOS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FormMessage state={{ ...state, message: undefined }} />
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton className="btn-soft">{row ? "Guardar" : "Crear capítulo"}</SubmitButton>
          {row && (
            <ConfirmButton
              onConfirm={async () => {
                const r = await deleteChapter(row.id);
                toast(r.ok ? "Capítulo eliminado. Sus recuerdos siguen guardados." : r.error ?? "Error", r.ok ? "ok" : "error");
                router.refresh();
              }}
            >
              Eliminar
            </ConfirmButton>
          )}
          {!row && onDone && (
            <button type="button" className="font-ui text-sm font-bold text-tinta-mute" onClick={onDone}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </Panel>
  );
}

// ——— Personas ———
type UserRow = { id: string; name: string; email: string; role: RoleId; relation: string | null; active: boolean; lastLoginAt: string | null; pending: boolean; inviteActive: boolean };

export function UserManager({ rows, meId }: { rows: UserRow[]; meId: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(createUser, { ok: false });
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  useOnResult(state, (s) => {
    if (s.ok) {
      if (s.message?.startsWith("http")) setNewLink(s.message);
      else toast(s.message ?? "Listo.");
      formRef.current?.reset();
      router.refresh();
    }
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {rows.map((u) => (
          <UserCard key={u.id} u={u} me={u.id === meId} />
        ))}
      </div>
      <Panel>
        <form ref={formRef} action={action} className="space-y-4">
          <h2 className="font-heading text-2xl font-extrabold">Dar acceso a alguien</h2>
          <input name="name" required className="field" placeholder="Nombre" aria-label="Nombre" />
          <input name="email" type="email" required className="field" placeholder="Correo" aria-label="Correo" />
          <input name="relation" className="field" placeholder="Relación (abuela, tío…)" aria-label="Relación" />
          <select name="role" defaultValue="FAMILY" className="field" aria-label="Rol">
            {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r].name} — {ROLE_LABELS[r].hint}
              </option>
            ))}
          </select>
          <p className="font-ui text-xs font-semibold text-tinta-mute">Al crear el acceso te damos un enlace de invitación: la persona lo abre y elige su propia clave.</p>
          <FormMessage state={{ ...state, message: state.message?.startsWith("http") ? undefined : state.message }} />
          <SubmitButton>Crear acceso</SubmitButton>
          {newLink && <InviteLinkBox link={newLink} />}
        </form>
      </Panel>
    </div>
  );
}

export function InviteLinkBox({ link, label = "Enlace de invitación (vale 14 días, se usa una sola vez)" }: { link: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Álbum de Joaquín", text: "Entra al álbum de Joaquín con este enlace:", url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      /* cancelado */
    }
  };
  return (
    <div className="mt-3 rounded-2xl border-2 border-esmeralda bg-esmeralda-100 p-3">
      <p className="font-ui text-xs font-bold text-tinta-soft">{label}</p>
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="field mt-1 py-2 font-mono text-xs" aria-label="Enlace" />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-soft py-2 text-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }}
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
        <button type="button" className="btn-soft py-2 text-sm" onClick={share}>
          Compartir…
        </button>
        <a className="btn-soft py-2 text-sm" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Entra al álbum de Joaquín: ${link}`)}`}>
          WhatsApp
        </a>
      </div>
    </div>
  );
}

function UserCard({ u, me }: { u: UserRow; me: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const run = async (p: Promise<ActionResult>, ok: string) => {
    const r = await p;
    toast(r.ok ? r.message ?? ok : r.error ?? "Error", r.ok ? "ok" : "error");
    router.refresh();
  };
  return (
    <Panel className={u.active ? "" : "opacity-60"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading text-xl font-bold">
            {u.name} {me && <span className="chip bg-menta">Tú</span>} {!u.active && <span className="chip bg-coral-100">Desactivado</span>}{" "}
            {u.pending && <span className="chip bg-sol-100">Falta aceptar la invitación</span>}
          </p>
          <p className="font-ui text-sm font-semibold text-tinta-mute">
            {u.email}
            {u.relation ? ` · ${u.relation}` : ""}
            {u.lastLoginAt ? ` · último ingreso ${formatDate(u.lastLoginAt.slice(0, 10))}` : " · nunca ha entrado"}
          </p>
        </div>
        <select value={u.role} disabled={me} onChange={(e) => run(updateUser(u.id, { role: e.target.value }), "Rol actualizado.")} className="field w-auto py-2" aria-label={`Rol de ${u.name}`}>
          {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r].name}
            </option>
          ))}
        </select>
      </div>
      {!me && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t-2 border-tinta/5 pt-3">
          <button className="rounded-full bg-tinta/5 px-4 py-2 font-ui text-sm font-bold" onClick={() => run(updateUser(u.id, { active: !u.active }), u.active ? "Acceso desactivado." : "Acceso activado.")}>
            {u.active ? "Desactivar" : "Activar"}
          </button>
          {showPwd ? (
            <span className="flex items-center gap-2">
              <input value={pwd} onChange={(e) => setPwd(e.target.value)} className="field w-48 py-2" placeholder="Nueva clave" aria-label="Nueva clave" />
              <button className="btn-soft py-2" onClick={() => run(resetUserPassword(u.id, pwd), "Clave cambiada.").then(() => { setShowPwd(false); setPwd(""); })}>
                Guardar
              </button>
            </span>
          ) : (
            <button className="rounded-full bg-tinta/5 px-4 py-2 font-ui text-sm font-bold" onClick={() => setShowPwd(true)}>
              Cambiar clave
            </button>
          )}
          <button
            className="rounded-full bg-esmeralda-100 px-4 py-2 font-ui text-sm font-bold text-tinta"
            onClick={async () => {
              const r = await createInviteLink(u.id);
              if (r.ok && r.message) setLink(r.message);
              else toast(r.error ?? "No se pudo crear el enlace.", "error");
            }}
          >
            {u.pending ? "Enlace de invitación" : "Enlace para nueva clave"}
          </button>
          <ConfirmButton onConfirm={() => run(deleteUser(u.id), "Persona eliminada.")}>Eliminar</ConfirmButton>
        </div>
      )}
      {link && <InviteLinkBox link={link} label={u.pending ? `Envíale este enlace a ${u.name} (vale 14 días)` : `Con este enlace ${u.name} elige una clave nueva (vale 14 días)`} />}
    </Panel>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ActionResult, FormData>(changeOwnPassword, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useOnResult(state, (s) => s.ok && ref.current?.reset());
  return (
    <Panel className="max-w-md">
      <form ref={ref} action={action} className="space-y-4">
        <h2 className="font-heading text-2xl font-extrabold">Cambiar mi clave</h2>
        <div>
          <label className="label" htmlFor="cur">
            Clave actual
          </label>
          <input id="cur" name="current" type="password" autoComplete="current-password" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="new">
            Nueva clave
          </label>
          <input id="new" name="next" type="password" autoComplete="new-password" minLength={8} required className="field" />
        </div>
        <FormMessage state={state} />
        <SubmitButton>Cambiar clave</SubmitButton>
      </form>
    </Panel>
  );
}
