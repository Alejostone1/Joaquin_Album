"use client";

import { useActionState, useState } from "react";
import { BubbleWord } from "@/components/ui/BubbleWord";
import { acceptInvite, type InviteState } from "./actions";

export function InviteForm({ token, name, relation, email }: { token: string; name: string; relation: string | null; email: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(acceptInvite, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="text-center">
      <input type="hidden" name="token" value={token} />
      <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-esmeralda">Bienvenida al álbum de</p>
      <BubbleWord text="JOAQUÍN" className="mt-2 text-[2.6rem] sm:text-5xl" />
      <p className="mt-5 font-display text-2xl font-semibold">
        Hola, {name}
        {relation ? ` · ${relation}` : ""}
      </p>
      <p className="mt-2 font-ui text-sm font-semibold text-tinta-soft">
        Elige tu clave para entrar. Tu correo para iniciar sesión es <b className="text-tinta">{email}</b>.
      </p>
      <div className="mt-6 grid gap-3 text-left">
        <label className="grid gap-1 font-ui text-sm font-bold">
          Nueva clave
          <input name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required className="rounded-2xl border-2 border-tinta/20 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-esmeralda" />
        </label>
        <label className="grid gap-1 font-ui text-sm font-bold">
          Repite la clave
          <input name="confirm" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required className="rounded-2xl border-2 border-tinta/20 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-esmeralda" />
        </label>
        <label className="flex items-center gap-2 font-ui text-sm font-semibold text-tinta-soft">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar la clave
        </label>
      </div>
      {state.error && <p className="mt-4 rounded-2xl bg-coral-100 px-4 py-2 font-ui text-sm font-bold text-coral-600">{state.error}</p>}
      <button className="btn-candy mt-6 w-full" disabled={pending}>
        {pending ? "Entrando…" : "Guardar y entrar"}
      </button>
    </form>
  );
}
