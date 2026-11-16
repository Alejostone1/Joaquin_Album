"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createShareLink, revokeShareLink, type ActionResult } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { InviteLinkBox } from "./managers";
import { ConfirmButton, FormMessage, Panel, SubmitButton, useToast } from "./ui";

type Row = { id: string; label: string; uses: number; createdAt: string; lastUsedAt: string | null; expiresAt: string | null; active: boolean };

export function ShareManager({ rows }: { rows: Row[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createShareLink, { ok: false });
  const [link, setLink] = useState<string | null>(null);
  const handled = useRef(state);
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.ok && state.message) {
      setLink(state.message);
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Panel>
        <form ref={formRef} action={action} className="space-y-4">
          <h2 className="font-heading text-2xl font-extrabold">Nuevo enlace</h2>
          <p className="font-ui text-sm font-semibold text-tinta-soft">
            Quien abra el enlace verá todo lo <b>publicado</b> en la historia, sin crear cuenta ni iniciar sesión. No puede editar nada ni ver las cartas para el futuro ni los borradores.
          </p>
          <input name="label" required maxLength={80} className="field" placeholder="¿Para quién? (ej.: Abuelos, Familia Pérez)" aria-label="Para quién" />
          <label className="block font-ui text-sm font-bold">
            Vence en
            <select name="days" defaultValue="0" className="field mt-1">
              <option value="0">Nunca (hasta que lo desactives)</option>
              <option value="7">7 días</option>
              <option value="30">30 días</option>
              <option value="90">3 meses</option>
              <option value="365">1 año</option>
            </select>
          </label>
          <FormMessage state={{ ...state, message: undefined }} />
          <SubmitButton>Crear enlace</SubmitButton>
          {link && <InviteLinkBox link={link} label="Copia este enlace ahora: por seguridad no se vuelve a mostrar." />}
        </form>
      </Panel>
      <div className="space-y-3">
        {rows.length === 0 && <Panel className="text-center font-ui font-bold text-tinta-mute">Todavía no hay enlaces para compartir.</Panel>}
        {rows.map((r) => (
          <Panel key={r.id} className={r.active ? "" : "opacity-60"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading text-xl font-bold">
                  {r.label} {r.active ? <span className="chip bg-esmeralda-100">Activo</span> : <span className="chip bg-coral-100">Desactivado</span>}
                </p>
                <p className="font-ui text-sm font-semibold text-tinta-mute">
                  Creado {formatDate(r.createdAt.slice(0, 10))} · abierto {r.uses} {r.uses === 1 ? "vez" : "veces"}
                  {r.lastUsedAt ? ` · última vez ${formatDate(r.lastUsedAt.slice(0, 10))}` : ""}
                  {r.expiresAt ? ` · vence ${formatDate(r.expiresAt.slice(0, 10))}` : ""}
                </p>
              </div>
              {r.active && (
                <ConfirmButton
                  onConfirm={async () => {
                    const res = await revokeShareLink(r.id);
                    toast(res.ok ? "Enlace desactivado: ya no abre el álbum." : res.error ?? "Error", res.ok ? "ok" : "error");
                    router.refresh();
                  }}
                >
                  Desactivar
                </ConfirmButton>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
