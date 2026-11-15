"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import { useFormStatus } from "react-dom";
import { Footprint } from "@/components/ui/Watercolor";

export function PageTitle({ title, kicker, color = "#2BA36B", children }: { title: string; kicker?: string; color?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && (
          <p className="flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.2em]" style={{ color }}>
            <Footprint className="h-4 w-4" color={color} />
            {kicker}
          </p>
        )}
        <h1 className="mt-1 font-heading text-4xl font-extrabold leading-none sm:text-5xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[1.8rem] border-2 border-tinta/10 bg-papel p-5 shadow-soft sm:p-6 ${className}`}>{children}</div>;
}

export function SubmitButton({ children, pending: pendingLabel = "Guardando…", className = "btn-candy" }: { children: React.ReactNode; pending?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; error?: string; message?: string } }) {
  if (state.error) return <p role="alert" className="rounded-2xl bg-coral-100 px-4 py-3 font-ui text-sm font-bold text-coral-600">{state.error}</p>;
  if (state.ok && state.message) return <p role="status" className="rounded-2xl bg-esmeralda-100 px-4 py-3 font-ui text-sm font-bold text-bosque">{state.message}</p>;
  return null;
}

export function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  return status === "PUBLISHED" ? <span className="chip bg-esmeralda-100 text-bosque">Publicado</span> : <span className="chip bg-sol-100 text-[#8a5a00]">Borrador</span>;
}

// ——— Avisos breves ———
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className={`rounded-2xl border-2 border-tinta px-4 py-3 font-ui text-sm font-bold shadow-soft ${t.tone === "ok" ? "bg-menta" : "bg-coral-100 text-coral-600"}`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/** Botón que pide confirmación en un segundo toque (sin diálogos del navegador). */
export function ConfirmButton({ onConfirm, children, confirmText = "¿Seguro? Toca otra vez", className = "" }: { onConfirm: () => void | Promise<void>; children: React.ReactNode; confirmText?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onBlur={() => setArmed(false)}
      onClick={async () => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 3500);
          return;
        }
        setBusy(true);
        await onConfirm();
        setBusy(false);
        setArmed(false);
      }}
      className={`rounded-full px-4 py-2 font-ui text-sm font-bold transition ${armed ? "bg-coral-600 text-papel" : "text-coral-600 hover:bg-coral-100"} ${className}`}
    >
      {busy ? "Eliminando…" : armed ? confirmText : children}
    </button>
  );
}
