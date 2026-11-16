"use client";

import { Reorder } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { reorderMemories, setMemoryStatus, sortMemoriesByDate } from "@/app/admin/actions";
import { useRouter } from "next/navigation";
import { Media } from "@/components/story/Media";
import { PRESENTATION_LABELS, SCENE_META, SCENES, type PresentationId, type SceneId } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { MediaDTO } from "@/lib/types";
import { StatusBadge, useToast } from "./ui";

export type BoardItem = {
  id: string;
  title: string;
  date: string | null;
  scene: SceneId;
  status: "DRAFT" | "PUBLISHED";
  presentation: PresentationId;
  cover: MediaDTO | null;
  count: number;
};

export function MemoryBoard({ items }: { items: BoardItem[] }) {
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [groups, setGroups] = useState<Record<string, BoardItem[]>>({});
  const toast = useToast();
  const router = useRouter();
  const latest = useRef(groups);
  latest.current = groups;
  useEffect(() => {
    const g: Record<string, BoardItem[]> = {};
    for (const s of SCENES) g[s] = items.filter((i) => i.scene === s);
    setGroups(g);
  }, [items]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("estado") === "borradores") setFilter("DRAFT");
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ALL", "Todos"],
            ["PUBLISHED", "Publicados"],
            ["DRAFT", "Borradores"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`rounded-full px-4 py-1.5 font-ui text-sm font-bold ${filter === k ? "bg-tinta text-papel" : "bg-tinta/5"}`}>
            {l}
          </button>
        ))}
      </div>
      {SCENES.filter((s) => s !== "CARTAS").map((scene) => {
        const list = groups[scene] ?? [];
        const meta = SCENE_META[scene];
        const visible = list.filter((i) => filter === "ALL" || i.status === filter);
        return (
          <section key={scene}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-extrabold" style={{ color: meta.accent }}>
                {meta.title} <span className="font-ui text-sm text-tinta-mute">({list.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {list.length > 1 && (
                  <button
                    onClick={async () => {
                      const r = await sortMemoriesByDate(scene);
                      toast(r.ok ? r.message ?? "Listo." : r.error ?? "Error", r.ok ? "ok" : "error");
                      router.refresh();
                    }}
                    className="rounded-full bg-tinta/5 px-3 py-1.5 font-ui text-sm font-bold hover:bg-tinta/10"
                  >
                    Ordenar por fecha
                  </button>
                )}
                <Link href={`/admin/recuerdos/nuevo?capitulo=${scene}`} className="font-ui text-sm font-bold underline decoration-2 underline-offset-4" style={{ color: meta.accent }}>
                  + Agregar aquí
                </Link>
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="rounded-3xl border-2 border-dashed border-tinta/10 p-5 font-ui text-sm font-bold text-tinta-mute">Sin recuerdos {filter === "DRAFT" ? "en borrador" : filter === "PUBLISHED" ? "publicados" : ""} en este capítulo.</p>
            ) : (
              <Reorder.Group
                axis="y"
                values={list}
                onReorder={(next) => setGroups((g) => ({ ...g, [scene]: next }))}
                className="space-y-2"
              >
                {visible.map((m) => (
                  <Reorder.Item
                    key={m.id}
                    value={m}
                    drag={filter === "ALL" ? "y" : false}
                    onDragEnd={async () => {
                      await new Promise((res) => setTimeout(res, 30));
                      const r = await reorderMemories((latest.current[scene] ?? []).map((x) => x.id));
                      toast(r.ok ? "Orden guardado." : r.error ?? "No se pudo ordenar.", r.ok ? "ok" : "error");
                    }}
                    className="flex items-center gap-3 rounded-2xl border-2 border-tinta/10 bg-papel p-2 pr-4"
                  >
                    {filter === "ALL" && <span className="cursor-grab select-none px-1 text-xl text-tinta-mute" aria-hidden>⋮⋮</span>}
                    {m.cover ? <Media media={m.cover} className="h-16 w-16 shrink-0 rounded-xl" sizes="80px" /> : <div className="h-16 w-16 shrink-0 rounded-xl bg-salvia-100" />}
                    <Link href={`/admin/recuerdos/${m.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-heading text-lg font-bold">{m.title}</p>
                      <p className="truncate font-ui text-xs font-bold text-tinta-mute">
                        {m.date ? `${formatDate(m.date)} · ` : ""}
                        {m.count} {m.count === 1 ? "archivo" : "archivos"} · {PRESENTATION_LABELS[m.presentation].name}
                      </p>
                    </Link>
                    <button
                      onClick={async () => {
                        const next = m.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
                        const r = await setMemoryStatus(m.id, next);
                        if (r.ok) {
                          setGroups((g) => ({ ...g, [scene]: g[scene].map((x) => (x.id === m.id ? { ...x, status: next } : x)) }));
                          toast(next === "PUBLISHED" ? "Publicado." : "Pasó a borrador.");
                        }
                      }}
                      title={m.status === "PUBLISHED" ? "Pasar a borrador" : "Publicar"}
                    >
                      <StatusBadge status={m.status} />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </section>
        );
      })}
    </div>
  );
}
