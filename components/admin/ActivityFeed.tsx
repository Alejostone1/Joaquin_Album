"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel } from "./ui";

export type ActivityRow = { id: string; userName: string; action: string; entity: string; entityId: string | null; summary: string; createdAt: string };

const COLORS = ["#2BA36B", "#E86A9A", "#3C9BE0", "#F2A516", "#9B7BE0", "#1FB5B0", "#FF8A7A"];
const colorFor = (name: string) => COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const ICON: Record<string, string> = { PUBLISH: "🌟", CREATE: "✏️", UPDATE: "✏️", UNPUBLISH: "📦", DELETE: "🗑️", UPLOAD: "📷", SHARE: "🔗", INVITE: "💌", JOIN: "👋" };

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "hace un momento";
  if (d < 3600) return `hace ${Math.round(d / 60)} min`;
  if (d < 86400) return `hace ${Math.round(d / 3600)} h`;
  if (d < 86400 * 7) return `hace ${Math.round(d / 86400)} ${Math.round(d / 86400) === 1 ? "día" : "días"}`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/** Agrupa subidas seguidas de la misma persona («subió 6 fotos y 1 video»). */
function group(rows: ActivityRow[]) {
  const out: Array<ActivityRow & { count?: { photos: number; videos: number } }> = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (r.action === "UPLOAD" && last?.action === "UPLOAD" && last.userName === r.userName && Math.abs(new Date(last.createdAt).getTime() - new Date(r.createdAt).getTime()) < 30 * 60e3) {
      last.count = last.count ?? { photos: last.summary.includes("video") ? 0 : 1, videos: last.summary.includes("video") ? 1 : 0 };
      if (r.summary.includes("video")) last.count.videos++;
      else last.count.photos++;
      continue;
    }
    out.push({ ...r });
  }
  return out.map((r) => {
    if (!r.count) return r;
    const parts = [r.count.photos ? `${r.count.photos} ${r.count.photos === 1 ? "foto" : "fotos"}` : "", r.count.videos ? `${r.count.videos} ${r.count.videos === 1 ? "video" : "videos"}` : ""].filter(Boolean);
    return { ...r, summary: `subió ${parts.join(" y ")}` };
  });
}

export function ActivityFeed({ rows, compact = false }: { rows: ActivityRow[]; compact?: boolean }) {
  const people = useMemo(() => Array.from(new Set(rows.map((r) => r.userName))), [rows]);
  const [who, setWho] = useState<string | null>(null);
  const list = group(rows.filter((r) => !who || r.userName === who));
  if (!rows.length) return <Panel className="text-center font-ui font-bold text-tinta-mute">Todavía no hay movimientos. Cuando alguien suba fotos o publique un recuerdo, aparecerá aquí.</Panel>;
  return (
    <div>
      {!compact && people.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={() => setWho(null)} className={`rounded-full border-2 px-4 py-1.5 font-ui text-sm font-bold ${!who ? "border-tinta bg-tinta text-papel" : "border-tinta/15 bg-white"}`}>
            Todos
          </button>
          {people.map((p) => (
            <button key={p} onClick={() => setWho(p)} className="flex items-center gap-2 rounded-full border-2 px-3 py-1.5 font-ui text-sm font-bold" style={{ borderColor: who === p ? colorFor(p) : "rgba(33,55,43,.12)", background: who === p ? `${colorFor(p)}33` : "#fff" }}>
              <span className="grid h-6 w-6 place-items-center rounded-full text-xs text-papel" style={{ background: colorFor(p) }}>
                {p.slice(0, 1)}
              </span>
              {p}
            </button>
          ))}
        </div>
      )}
      <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-[3px] before:rounded-full before:bg-tinta/10">
        {list.slice(0, compact ? 6 : 300).map((r, i) => (
          <motion.li key={r.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="relative flex gap-3">
            <span className="relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-papel font-heading text-lg font-extrabold text-papel shadow-soft" style={{ background: colorFor(r.userName) }}>
              {r.userName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl border-2 border-tinta/5 bg-white px-4 py-2.5 shadow-soft">
              <p className="font-ui text-[15px] font-semibold leading-snug">
                <span className="mr-1">{ICON[r.action] ?? "•"}</span>
                <b>{r.userName}</b> {r.summary}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 font-ui text-xs font-bold text-tinta-mute">
                {ago(r.createdAt)}
                {r.entity === "MEMORY" && r.entityId && r.action !== "DELETE" && (
                  <Link href={`/historia?preview=1#recuerdo-${r.entityId}`} className="text-turquesa underline decoration-2 underline-offset-2">
                    Ver en la historia
                  </Link>
                )}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
