"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useAudio } from "@/components/audio/AudioProvider";
import { BubbleWord } from "@/components/ui/BubbleWord";
import { PteroArt, StegoArt, TriceArt } from "@/components/ui/DinoArt";
import { EggIcon, FernLeaf, Footprint, WatercolorBlob } from "@/components/ui/Watercolor";
import { MILESTONE_LABELS, type MilestoneTypeId, type SceneMeta } from "@/lib/constants";
import { addYears, formatDate, formatTime, monthYear } from "@/lib/format";
import type { BirthDTO, LetterDTO, MediaDTO, MemoryDTO, MilestoneDTO, SceneDTO, ViewerDTO } from "@/lib/types";
import { createLetter, type LetterFormState } from "@/app/historia/actions";
import { MilestoneIcon } from "./icons";
import { Media } from "./Media";
import { MemoryView } from "./presentations";
import { gsap, useScrollFx } from "./useScrollFx";

// ——— Apertura de capítulo ———
export function ChapterOpener({ scene, meta, number }: { scene: SceneDTO; meta: SceneMeta; number: number }) {
  const words = scene.title.split(" ");
  const Art = meta.companion === "trice" ? TriceArt : meta.companion === "ptero" ? PteroArt : meta.companion === "baby" ? null : StegoArt;
  return (
    <header className="relative flex min-h-[86svh] items-center overflow-hidden px-5 py-28">
      <WatercolorBlob color={meta.accent} seed={number * 5 + 1} className="absolute -left-24 top-10 h-[60vh] w-[60vh]" opacity={0.22} />
      <WatercolorBlob color="#FFE89A" seed={number * 7 + 2} className="absolute -right-16 bottom-0 h-[44vh] w-[44vh]" opacity={0.35} />
      <FernLeaf className="absolute bottom-0 left-[6%] h-52 w-24 -rotate-12 opacity-60" color={meta.accent} />
      <FernLeaf className="absolute bottom-0 right-[10%] h-64 w-28 rotate-12 opacity-40" color="#2F5D47" />
      <div className="relative mx-auto w-full max-w-6xl">
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full border-2 border-tinta bg-papel px-4 py-1.5 font-ui text-sm font-bold uppercase tracking-[0.2em]"
        >
          <Footprint className="h-4 w-4" color={meta.accent} />
          {scene.subtitle || `Capítulo ${number}`}
        </motion.p>
        <motion.h2
          className="mt-6 font-heading text-[clamp(3.2rem,11vw,9rem)] font-extrabold leading-[0.88] tracking-tight"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {words.map((w, i) => (
            <span key={i} className={`inline-block overflow-hidden pb-[0.08em] align-bottom ${i < words.length - 1 ? "mr-[0.22em]" : ""}`}>
              <motion.span
                className="inline-block"
                style={{ color: i === 0 ? meta.accent : undefined }}
                variants={{ hidden: { y: "105%", rotate: 6 }, show: { y: "0%", rotate: 0, transition: { type: "spring", stiffness: 140, damping: 18 } } }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </motion.h2>
        {scene.phrase && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-6 max-w-2xl font-display text-[clamp(1.3rem,3vw,2rem)] font-medium leading-snug text-tinta-soft"
          >
            “{scene.phrase}”
          </motion.p>
        )}
      </div>
      {Art && (
        <motion.div
          className="pointer-events-none absolute bottom-8 right-[4%] hidden w-[min(30vw,320px)] md:block"
          initial={{ x: 120, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 70, damping: 14, delay: 0.3 }}
        >
          <Art className="w-full" />
        </motion.div>
      )}
      {meta.companion === "baby" && (
        <motion.div className="pointer-events-none absolute bottom-10 right-[8%] hidden w-28 md:block" animate={{ rotate: [0, -10, 10, -6, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}>
          <EggIcon className="w-full" />
        </motion.div>
      )}
    </header>
  );
}

export function EmptyChapter({ canEdit, accent, label }: { canEdit: boolean; accent: string; label: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 pb-24 text-center">
      <StegoArt className="w-56 opacity-90" />
      <p className="mt-4 font-heading text-2xl font-bold">Este capítulo todavía se está escribiendo.</p>
      <p className="mt-2 text-tinta-soft">{canEdit ? `Agrega el primer recuerdo de “${label}” desde el administrador.` : "Muy pronto habrá recuerdos aquí."}</p>
      {canEdit && (
        <Link href="/admin/recuerdos/nuevo" className="btn-soft mt-5" style={{ boxShadow: `0 4px 0 ${accent}` }}>
          Crear un recuerdo
        </Link>
      )}
    </div>
  );
}

export function MemoryList({ memories, accent }: { memories: MemoryDTO[]; accent: string }) {
  return (
    <div>
      {memories.map((m, i) => (
        <div key={m.id} id={`recuerdo-${m.id}`}>
          <MemoryView memory={m} accent={accent} index={i} />
        </div>
      ))}
    </div>
  );
}

// ——— El día que llegaste ———
function Fact({ label, value, icon, canEdit }: { label: string; value: string | null; icon: React.ReactNode; canEdit: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/70 p-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coral-100 text-coral-600">{icon}</div>
      <div className="min-w-0">
        <p className="font-ui text-xs font-bold uppercase tracking-widest text-tinta-mute">{label}</p>
        {value ? (
          <p className="font-heading text-xl font-extrabold leading-tight sm:text-2xl">{value}</p>
        ) : (
          <p className="font-ui text-sm font-bold text-tinta-mute">
            <span className="rounded-lg border-2 border-dashed border-tinta/20 px-2 py-0.5">{canEdit ? "Por completar" : "Pronto"}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function BirthScene({ birth, accent, canEdit }: { birth: BirthDTO; accent: string; canEdit: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useScrollFx(ref, (el) => {
    gsap.to(el.querySelector(".rays"), { rotate: 360, duration: 90, repeat: -1, ease: "none" });
    gsap.fromTo(el.querySelector(".arch"), { clipPath: "inset(100% 0% 0% 0% round 999px 999px 32px 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 999px 999px 32px 32px)", duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 65%" } });
  });
  return (
    <section ref={ref} className="relative mx-auto max-w-6xl px-5 pb-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className="relative mx-auto w-full max-w-md">
          <svg viewBox="0 0 200 200" className="rays absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] opacity-50" aria-hidden>
            {Array.from({ length: 18 }, (_, i) => (
              <path key={i} d="M100 100 L96 0 L104 0Z" fill={i % 2 ? "#FFC93C" : "#FFB38A"} transform={`rotate(${i * 20} 100 100)`} />
            ))}
          </svg>
          <div className="arch relative aspect-[3/4] overflow-hidden rounded-b-[2rem] rounded-t-full border-[6px] border-papel shadow-lift">
            {birth.mainPhoto ? (
              <Media media={birth.mainPhoto} className="h-full w-full" priority sizes="(min-width: 768px) 40vw, 90vw" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-b from-coral-100 to-crema p-8 text-center">
                <div>
                  <EggIcon className="mx-auto w-24" />
                  <p className="mt-4 font-heading text-xl font-bold">Aquí irá la primera foto de Joaquín</p>
                  {canEdit && (
                    <Link href="/admin/nacimiento" className="btn-soft mt-4">
                      Elegir la foto
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold" style={{ color: accent }}>
            ¡Bienvenido al mundo, Joaquín!
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Fact canEdit={canEdit} label="Fecha" value={birth.birthDate ? formatDate(birth.birthDate) : null} icon={<CalendarIcon />} />
            <Fact canEdit={canEdit} label="Hora" value={birth.birthTime ? formatTime(birth.birthTime) : null} icon={<ClockIcon />} />
            <Fact canEdit={canEdit} label="Peso" value={birth.weight} icon={<ScaleIcon />} />
            <Fact canEdit={canEdit} label="Estatura" value={birth.height} icon={<RulerIcon />} />
          </div>
          {birth.place && <p className="mt-4 font-ui font-bold text-tinta-soft">Nació en {birth.place}</p>}
          {birth.firstMeeting ? (
            <blockquote className="relative mt-8 rounded-[1.6rem] bg-papel p-6 shadow-soft">
              <p className="font-ui text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                El primer encuentro
              </p>
              <p className="mt-2 font-heading text-xl font-semibold leading-snug">{birth.firstMeeting}</p>
            </blockquote>
          ) : (
            canEdit && (
              <Link href="/admin/nacimiento" className="btn-soft mt-8">
                Escribir el primer encuentro
              </Link>
            )
          )}
          {birth.note && <p className="mt-4 text-lg text-tinta-soft">{birth.note}</p>}
        </div>
      </div>
    </section>
  );
}

const ic = "h-6 w-6";
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
const ScaleIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 8h12l2 12H4z" /><circle cx="12" cy="5" r="2" /></svg>
);
const RulerIcon = () => (
  <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><rect x="8" y="2.5" width="8" height="19" rx="2" /><path d="M8 7h3M8 11h4M8 15h3M8 19h4" /></svg>
);

// ——— Así voy creciendo: línea de tiempo ———
export function Timeline({ milestones, accent, canEdit }: { milestones: MilestoneDTO[]; accent: string; canEdit: boolean }) {
  const [filter, setFilter] = useState<MilestoneTypeId | "ALL">("ALL");
  const types = useMemo(() => Array.from(new Set(milestones.map((m) => m.type))), [milestones]);
  const items = filter === "ALL" ? milestones : milestones.filter((m) => m.type === filter);
  const wrap = useRef<HTMLElement>(null);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useScrollFx(
    wrap,
    (el) => {
      if (!desktop) return;
      const track = el.querySelector<HTMLElement>(".track")!;
      const walker = el.querySelector<HTMLElement>(".walker");
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
      const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector(".pin"), start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true } });
      tl.to(track, { x: () => -distance(), ease: "none" }, 0);
      if (walker) tl.fromTo(walker, { left: "4%" }, { left: "82%", ease: "none" }, 0);
    },
    [desktop, items.length, filter],
  );

  if (!milestones.length) {
    return (
      <div className="mx-auto max-w-xl px-6 pb-20 text-center">
        <p className="font-heading text-2xl font-bold">La línea de tiempo empieza muy pronto.</p>
        <p className="mt-2 text-tinta-soft">Aquí aparecerán los meses, los cumpleaños, las primeras palabras y los primeros pasos.</p>
        {canEdit && (
          <Link href="/admin/linea-de-tiempo" className="btn-soft mt-5">
            Agregar un momento
          </Link>
        )}
      </div>
    );
  }

  return (
    <section ref={wrap} className="relative pb-16">
      <div className="mx-auto mb-6 flex max-w-6xl flex-wrap gap-2 px-5" role="group" aria-label="Filtrar momentos">
        <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} color={accent}>
          Todos
        </FilterChip>
        {types.map((t) => (
          <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)} color={MILESTONE_LABELS[t].color}>
            {MILESTONE_LABELS[t].name}
          </FilterChip>
        ))}
      </div>
      {desktop ? (
        <div className="pin relative flex h-[100svh] items-center overflow-hidden">
          <div className="walker pointer-events-none absolute top-[9%] w-36">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
              <StegoArt className="w-full" />
            </motion.div>
          </div>
          <div className="track relative flex items-center gap-10 pl-[8vw] pr-[20vw] will-change-transform">
            <svg className="absolute left-0 top-1/2 h-4 w-full -translate-y-1/2" preserveAspectRatio="none" aria-hidden>
              <line x1="0" y1="8" x2="100%" y2="8" stroke="#21372B" strokeOpacity=".25" strokeWidth="4" strokeDasharray="2 16" strokeLinecap="round" />
            </svg>
            {items.map((m, i) => (
              <MilestoneCard key={m.id} m={m} up={i % 2 === 0} />
            ))}
          </div>
        </div>
      ) : (
        <ol className="relative mx-auto max-w-xl space-y-6 px-5 before:absolute before:bottom-0 before:left-[2.1rem] before:top-0 before:border-l-4 before:border-dotted before:border-tinta/20">
          {items.map((m) => (
            <motion.li key={m.id} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-10%" }} className="relative pl-14">
              <span className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full border-[3px] border-papel text-papel" style={{ background: MILESTONE_LABELS[m.type].color }}>
                <MilestoneIcon type={m.type} className="h-4 w-4" />
              </span>
              <MilestoneBody m={m} />
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FilterChip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full border-2 px-4 py-1.5 font-ui text-sm font-bold transition"
      style={{ borderColor: color, background: active ? color : "transparent", color: active ? "#FFFCF5" : "#21372B" }}
    >
      {children}
    </button>
  );
}

function MilestoneBody({ m }: { m: MilestoneDTO }) {
  const meta = MILESTONE_LABELS[m.type];
  return (
    <div className="overflow-hidden rounded-[1.6rem] bg-papel shadow-soft">
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 font-ui text-xs font-bold uppercase tracking-widest text-papel" style={{ background: meta.color }}>
        <span>{meta.name}</span>
        <span className="opacity-90">{monthYear(m.date)}</span>
      </div>
      {m.media && <Media media={m.media} className="aspect-[4/3] w-full" sizes="360px" />}
      <div className="p-5">
        {m.status === "DRAFT" && <span className="chip mb-2 bg-sol">Borrador</span>}
        <p className="font-ui text-sm font-bold text-tinta-mute">{formatDate(m.date)}</p>
        <h4 className="mt-1 font-heading text-2xl font-extrabold leading-tight">{m.title}</h4>
        {m.description && <p className="mt-2 text-tinta-soft">{m.description}</p>}
        {m.stage && (
          <span className="chip mt-3" style={{ background: `${m.stage.color}33` }}>
            {m.stage.name}
          </span>
        )}
      </div>
    </div>
  );
}

function MilestoneCard({ m, up }: { m: MilestoneDTO; up: boolean }) {
  const meta = MILESTONE_LABELS[m.type];
  return (
    <div className={`relative flex w-[320px] shrink-0 flex-col items-center ${up ? "-translate-y-[22vh]" : "translate-y-[22vh]"}`}>
      <div className="w-full">
        <MilestoneBody m={m} />
      </div>
      <span
        className={`absolute left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border-4 border-papel text-papel shadow-soft ${up ? "-bottom-[calc(22vh-1.5rem)]" : "-top-[calc(22vh-1.5rem)]"}`}
        style={{ background: meta.color }}
      >
        <MilestoneIcon type={m.type} />
      </span>
    </div>
  );
}

// ——— Mi familia: mesa de fotos para arrastrar ———
export function FamilyTable({ memories, accent }: { memories: MemoryDTO[]; accent: string }) {
  const photos = useMemo(() => memories.flatMap((m) => m.media.filter((x) => x.kind === "IMAGE").map((x) => ({ ...x, from: m.title }))).slice(0, 9), [memories]);
  const table = useRef<HTMLDivElement>(null);
  const { play } = useAudio();
  if (photos.length < 2) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 pb-10">
      <p className="mb-3 text-center font-ui text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>
        Arrastra las fotos sobre la mesa
      </p>
      <div ref={table} className="relative h-[70vh] overflow-hidden rounded-[2.4rem] border-[3px] border-dashed border-tinta/15 bg-crema/70">
        {photos.map((p, i) => (
          <motion.div
            key={p.id}
            drag
            dragConstraints={table}
            dragElastic={0.15}
            onDragStart={() => play("paper")}
            whileDrag={{ scale: 1.08, rotate: 0, zIndex: 50, cursor: "grabbing" }}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 160, damping: 14, delay: i * 0.06 }}
            className="absolute w-[min(42vw,220px)] cursor-grab rounded-lg bg-papel p-2.5 pb-9 shadow-lift"
            style={{ left: `${8 + ((i * 29) % 70)}%`, top: `${6 + ((i * 37) % 58)}%`, rotate: ((i * 47) % 24) - 12 }}
          >
            <Media media={p} className="pointer-events-none aspect-square rounded" sizes="240px" />
            <p className="absolute inset-x-2 bottom-2 truncate text-center font-heading text-sm font-bold text-tinta-soft">{p.caption || p.from}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ——— Cartas para mi futuro ———
export function LettersScene({ letters, viewer, birthDate, accent }: { letters: LetterDTO[]; viewer: ViewerDTO; birthDate: string | null; accent: string }) {
  const [open, setOpen] = useState<LetterDTO | null>(null);
  const [writing, setWriting] = useState(false);
  const { play } = useAudio();
  const colors = ["#FFE6EF", "#E2F2FC", "#FFF4D6", "#DDF5F3", "#FFE9E1", "#E3F2E1"];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-28">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-lg text-tinta-soft">
          Escríbele algo a Joaquín para cuando sea grande. Puedes dejar la carta abierta o sellarla hasta una fecha especial: nadie podrá leerla antes.
        </p>
        <button
          className="btn-candy"
          onClick={() => {
            play("paper");
            setWriting(true);
          }}
        >
          Escribir una carta
        </button>
      </div>
      {letters.length === 0 ? (
        <div className="grid place-items-center rounded-[2rem] border-[3px] border-dashed border-tinta/15 py-16 text-center">
          <Envelope color="#FFF4D6" sealed={false} />
          <p className="mt-6 font-heading text-2xl font-bold">Todavía no hay cartas.</p>
          <p className="text-tinta-soft">La primera puede ser la tuya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {letters.map((l, i) => (
            <motion.button
              key={l.id}
              layoutId={`letter-${l.id}`}
              onClick={() => {
                play(l.body ? "paper" : "boop");
                setOpen(l);
              }}
              className="group flex flex-col items-center gap-3 rounded-[1.6rem] p-4 text-center transition hover:-translate-y-1"
              initial={{ opacity: 0, y: 30, rotate: i % 2 ? 3 : -3 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Envelope color={colors[i % colors.length]} sealed={l.sealed} />
              <span className="font-heading text-lg font-bold leading-tight">De {l.authorName}</span>
              <span className="font-ui text-xs font-bold text-tinta-mute">{l.sealed ? `Se abre el ${formatDate(l.openAt)}` : l.relation || "Abierta"}</span>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-bosque-900/40 backdrop-blur-sm" aria-label="Cerrar carta" onClick={() => setOpen(null)} />
            <motion.article
              layoutId={`letter-${open.id}`}
              role="dialog"
              aria-modal="true"
              className="relative max-h-[86svh] w-full max-w-xl overflow-y-auto rounded-[1.6rem] border-[3px] border-tinta bg-papel p-8 shadow-lift"
              style={{ backgroundImage: "repeating-linear-gradient(transparent 0 34px, #21372B12 34px 35px)" }}
            >
              <p className="font-ui text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                Para Joaquín, de {open.authorName}
                {open.relation ? ` (${open.relation})` : ""}
              </p>
              {open.body ? (
                <>
                  {open.sealed && open.mine && <p className="mt-2 rounded-xl bg-sol-100 px-3 py-2 font-ui text-sm font-bold">Sólo tú puedes leerla hasta el {formatDate(open.openAt)}.</p>}
                  <p className="mt-5 whitespace-pre-line font-heading text-xl leading-[35px]">{open.body}</p>
                  <p className="mt-6 text-right font-ui text-sm font-bold text-tinta-mute">{formatDate(open.createdAt.slice(0, 10))}</p>
                </>
              ) : (
                <div className="py-10 text-center">
                  <Envelope color="#FFF4D6" sealed />
                  <p className="mt-6 font-heading text-2xl font-bold">Esta carta está sellada</p>
                  <p className="mt-1 text-tinta-soft">Se podrá abrir el {formatDate(open.openAt)}.</p>
                </div>
              )}
              <button className="btn-soft mt-6" onClick={() => setOpen(null)}>
                Cerrar
              </button>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
      <LetterForm open={writing} onClose={() => setWriting(false)} viewer={viewer} birthDate={birthDate} />
    </section>
  );
}

function Envelope({ color, sealed }: { color: string; sealed: boolean }) {
  return (
    <svg viewBox="0 0 120 84" className="w-full max-w-[160px] drop-shadow-[0_8px_10px_rgba(33,55,43,.18)] transition group-hover:rotate-[-3deg]" aria-hidden>
      <rect x="3" y="3" width="114" height="78" rx="10" fill={color} stroke="#21372B" strokeWidth="3" />
      <path d="M5 8 L60 48 L115 8" fill="none" stroke="#21372B" strokeWidth="3" strokeLinejoin="round" />
      {sealed ? (
        <g transform="translate(60 48)">
          <circle r="13" fill="#E86A9A" stroke="#21372B" strokeWidth="2.5" />
          <path d="M-5 3c0-4 3-7 6-7 2 0 3 1 4 2l2-1c1 0 1 1 1 1l-2 2v1c0 2-1 3-3 3h-6c-1 0-2 0-2-1z" fill="#FFE6EF" />
        </g>
      ) : (
        <path d="M54 42c-3-3-8 1-6 5l12 10 12-10c2-4-3-8-6-5l-6 5z" fill="#FF8A7A" />
      )}
    </svg>
  );
}

function LetterForm({ open, onClose, viewer, birthDate }: { open: boolean; onClose: () => void; viewer: ViewerDTO; birthDate: string | null }) {
  const [state, action, pending] = useActionState<LetterFormState, FormData>(createLetter, { ok: false });
  const [when, setWhen] = useState<"now" | "18" | "date">("now");
  const { play } = useAudio();
  const handled = useRef(state);
  useEffect(() => {
    if (state !== handled.current && state.ok) {
      handled.current = state;
      play("chime");
      onClose();
    }
  }, [state, onClose, play]);
  useEffect(() => {
    if (open) setWhen("now");
  }, [open]);
  const eighteen = birthDate ? addYears(birthDate, 18) : null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-end p-3 sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-bosque-900/40 backdrop-blur-sm" aria-label="Cerrar" onClick={onClose} />
          <motion.form
            action={action}
            initial={{ y: 60, rotate: -2 }}
            animate={{ y: 0, rotate: 0 }}
            exit={{ y: 60, opacity: 0 }}
            className="relative max-h-[92svh] w-full max-w-xl space-y-4 overflow-y-auto rounded-[2rem] border-[3px] border-tinta bg-papel p-6 shadow-lift sm:p-8"
          >
            <h3 className="font-heading text-3xl font-extrabold">Una carta para Joaquín</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="authorName">
                  Firma
                </label>
                <input id="authorName" name="authorName" className="field" defaultValue={viewer.name} required maxLength={80} />
              </div>
              <div>
                <label className="label" htmlFor="relation">
                  ¿Quién eres para él?
                </label>
                <input id="relation" name="relation" className="field" defaultValue={viewer.relation ?? ""} placeholder="Tía, abuelo, padrino…" maxLength={60} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="body">
                Tu carta
              </label>
              <textarea id="body" name="body" required rows={7} maxLength={8000} className="field resize-y font-heading text-lg" placeholder="Querido Joaquín…" />
            </div>
            <fieldset>
              <legend className="label">¿Cuándo podrá leerla?</legend>
              <div className="flex flex-wrap gap-2">
                {[
                  ["now", "Desde ya"],
                  ...(eighteen ? [["18", "Cuando cumpla 18 años"]] : []),
                  ["date", "En una fecha que yo elija"],
                ].map(([v, l]) => (
                  <label key={v} className={`cursor-pointer rounded-full border-2 px-4 py-2 font-ui text-sm font-bold transition ${when === v ? "border-tinta bg-sol" : "border-tinta/20"}`}>
                    <input type="radio" name="when" value={v} className="sr-only" checked={when === v} onChange={() => setWhen(v as typeof when)} />
                    {l}
                  </label>
                ))}
              </div>
              {when === "18" && eighteen && <input type="hidden" name="openAt" value={eighteen} />}
              {when === "date" && <input type="date" name="openAt" required className="field mt-3" min={new Date().toISOString().slice(0, 10)} />}
            </fieldset>
            {state.error && <p className="rounded-2xl bg-coral-100 px-4 py-3 font-ui text-sm font-bold text-coral-600">{state.error}</p>}
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={pending} className="btn-candy">
                {pending ? "Guardando…" : when === "now" ? "Guardar la carta" : "Sellar la carta"}
              </button>
              <button type="button" className="btn-soft" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ——— Final ———
export function Ending() {
  return (
    <section className="relative overflow-hidden px-5 pb-28 pt-16 text-center">
      <WatercolorBlob color="#BDECD3" seed={77} className="absolute left-1/2 top-0 h-[60vh] w-[90vw] -translate-x-1/2" opacity={0.5} />
      <div className="relative">
        <p className="font-display text-2xl font-semibold text-tinta-soft">Y esto apenas comienza…</p>
        <div className="mt-4">
          <BubbleWord text="CONTINUARÁ" className="text-[clamp(2.6rem,9vw,6rem)]" animate />
        </div>
        <div className="mx-auto mt-10 w-64">
          <StegoArt className="w-full" />
        </div>
        <button className="btn-soft mt-8" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Volver al inicio
        </button>
      </div>
    </section>
  );
}

export type { MediaDTO };
