"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EggIcon } from "@/components/ui/Watercolor";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
};

export function LoginSheet({ open, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => firstField.current?.focus(), 250);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión. Inténtalo de nuevo.");
        setBusy(false);
        return;
      }
      onSuccess(data.name ?? "");
    } catch {
      setError("Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button aria-label="Cerrar" className="absolute inset-0 bg-bosque-900/35 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            initial={{ y: 80, scale: 0.92, rotate: -2 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            exit={{ y: 80, scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-md rounded-[2rem] border-[3px] border-tinta bg-papel p-6 pt-10 shadow-lift sm:p-8 sm:pt-12"
          >
            <motion.div
              className="absolute -top-10 left-1/2 h-20 w-16 -translate-x-1/2"
              animate={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.2 }}
            >
              <EggIcon className="h-full w-full drop-shadow" />
            </motion.div>
            <h2 id="login-title" className="text-center font-heading text-3xl font-extrabold leading-tight">
              ¡Hola, familia!
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-center font-ui text-sm font-semibold text-tinta-soft">
              Este es el espacio privado de Joaquín. Entra con el correo y la clave que te dieron.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Correo
                </label>
                <input ref={firstField} id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Clave
                </label>
                <input id="password" type="password" autoComplete="current-password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-coral-100 px-4 py-3 font-ui text-sm font-bold text-coral-600">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <button type="submit" disabled={busy} className="btn-candy w-full disabled:opacity-70">
                {busy ? "Abriendo el huevo…" : "Entrar a mi historia"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
