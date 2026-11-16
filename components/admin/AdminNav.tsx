"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BubbleWord } from "@/components/ui/BubbleWord";

type Item = { href: string; label: string; hint: string; color: string; icon: IconName; exact?: boolean; admin?: boolean };
const ITEMS: Item[] = [
  { href: "/admin", label: "Inicio", hint: "Resumen y novedades", color: "#2BA36B", icon: "home", exact: true },
  { href: "/admin/biblioteca", label: "Fotos y videos", hint: "Subir y ver todo", color: "#1FB5B0", icon: "photo" },
  { href: "/admin/recuerdos", label: "Recuerdos", hint: "Crear y ordenar", color: "#FF8A7A", icon: "heart" },
  { href: "/admin/linea-de-tiempo", label: "Línea de tiempo", hint: "Momentos y fechas", color: "#F2A516", icon: "clock" },
  { href: "/admin/nacimiento", label: "Nacimiento", hint: "Fecha, peso, hora", color: "#E86A9A", icon: "egg" },
  { href: "/admin/etapas", label: "Etapas", hint: "Edades y colores", color: "#3C9BE0", icon: "steps" },
  { href: "/admin/cartas", label: "Cartas", hint: "Para su futuro", color: "#FF9F68", icon: "mail" },
  { href: "/admin/escenas", label: "Capítulos", hint: "Crear y renombrar", color: "#2F5D47", icon: "book" },
  { href: "/admin/historial", label: "Historial", hint: "Quién hizo qué", color: "#C2507E", icon: "list" },
  { href: "/admin/usuarios", label: "Personas", hint: "Accesos e invitaciones", color: "#9B7BE0", icon: "people", admin: true },
  { href: "/admin/compartir", label: "Compartir álbum", hint: "Enlace sin cuenta", color: "#0F9C97", icon: "share", admin: true },
  { href: "/admin/cuenta", label: "Mi cuenta", hint: "Cambiar mi clave", color: "#6E8075", icon: "user" },
];

export function AdminNav({ isAdmin, isEditor, name }: { isAdmin: boolean; isEditor: boolean; name: string }) {
  const path = usePathname();
  const router = useRouter();
  const items = isEditor ? ITEMS.filter((i) => !i.admin || isAdmin) : ITEMS.filter((i) => i.href === "/admin/cuenta");
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  return (
    <>
      {/* escritorio */}
      <aside className="sticky top-0 hidden h-[100svh] w-64 shrink-0 flex-col border-r-2 border-tinta/10 bg-salvia-50 p-5 lg:flex">
        <Link href="/admin" className="block">
          <BubbleWord text="Joaquín" className="text-4xl" animate={false} />
          <p className="mt-1 font-ui text-xs font-bold uppercase tracking-[0.2em] text-tinta-mute">Administrador familiar</p>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Secciones del administrador">
          {items.map((i) => {
            const on = i.exact ? path === i.href : path.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className="group flex items-center gap-3 rounded-2xl px-3 py-2 font-heading text-[17px] font-bold transition hover:bg-white" style={{ background: on ? `${i.color}22` : undefined }}>
                <span className={`grid h-8 w-8 place-items-center rounded-xl transition ${on ? "scale-110 text-papel" : "group-hover:scale-110"}`} style={{ background: on ? i.color : `${i.color}1f`, color: on ? undefined : i.color }}>
                  <Icon name={i.icon} className="h-[18px] w-[18px]" />
                </span>
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t-2 border-tinta/10 pt-4">
          <Link href="/historia" className="btn-soft w-full">
            Ver la historia
          </Link>
          <button onClick={logout} className="w-full rounded-full py-2 font-ui text-sm font-bold text-tinta-mute hover:text-coral-600">
            Cerrar sesión de {name.split(" ")[0]}
          </button>
        </div>
      </aside>
      {/* móvil: barra superior con la sección actual + barra inferior con pestañas y menú de mosaicos */}
      <MobileNav items={items} path={path} name={name} onLogout={logout} />
    </>
  );
}

type IconName = "home" | "photo" | "heart" | "clock" | "egg" | "steps" | "mail" | "book" | "list" | "people" | "share" | "user" | "plus" | "grid" | "eye" | "out";
const PATHS: Record<IconName, string> = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  photo: "M4 6h16v12H4zM8 13l3-3 5 5M15 10.5a1 1 0 1 0 0-.01",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  egg: "M12 3c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11zM8 14l2-2 2 2 2-2 2 2",
  steps: "M4 20h4v-4h4v-4h4V8h4",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  book: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h6",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 6",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  plus: "M12 5v14M5 12h14",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  out: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
};
function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

function MobileNav({ items, path, name, onLogout }: { items: Item[]; path: string; name: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const isOn = (i: Item) => (i.exact ? path === i.href : path.startsWith(i.href));
  const current = items.find(isOn) ?? items[0];
  // en el formulario de un recuerdo, la barra inferior la ocupa el botón de guardar
  const inForm = /^\/admin\/recuerdos\/.+/.test(path);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const tabs = ["/admin", "/admin/biblioteca", "/admin/recuerdos"].map((h) => items.find((i) => i.href === h)).filter(Boolean) as Item[];
  const editor = tabs.length === 3;

  return (
    <>
      {/* barra superior: dónde estoy */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b-2 border-tinta/10 bg-salvia-50/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <Link href="/admin" aria-label="Inicio del administrador">
          <BubbleWord text="Joaquín" className="text-2xl" animate={false} />
        </Link>
        <button onClick={() => setOpen(true)} className="flex min-w-0 items-center gap-2 rounded-full border-2 bg-white py-1 pl-1 pr-3 shadow-soft" style={{ borderColor: `${current.color}55` }} aria-label="Abrir el menú de secciones">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-papel" style={{ background: current.color }}>
            <Icon name={current.icon} className="h-4 w-4" />
          </span>
          <span className="truncate font-heading text-sm font-extrabold">{current.label}</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <Link href="/historia" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-tinta bg-sol shadow-[0_3px_0_#21372b]" aria-label="Ver la historia">
          <Icon name="eye" />
        </Link>
      </div>

      {/* barra inferior con pestañas */}
      {!inForm && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-tinta/10 bg-papel/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden" aria-label="Secciones principales">
          <div className="mx-auto grid max-w-md grid-cols-5 items-end">
            {editor ? (
              <>
                <Tab item={tabs[0]} on={isOn(tabs[0])} />
                <Tab item={tabs[1]} on={isOn(tabs[1])} label="Fotos" />
                <Link href="/admin/recuerdos/nuevo" className="-mt-7 flex flex-col items-center gap-1" aria-label="Crear un recuerdo nuevo">
                  <motion.span whileTap={{ scale: 0.9 }} className="grid h-16 w-16 place-items-center rounded-full border-[3px] border-tinta bg-sol text-tinta shadow-[0_5px_0_#21372b]">
                    <Icon name="plus" className="h-8 w-8" />
                  </motion.span>
                  <span className="font-ui text-[11px] font-extrabold">Nuevo</span>
                </Link>
                <Tab item={tabs[2]} on={isOn(tabs[2])} />
              </>
            ) : (
              <span className="col-span-4" />
            )}
            <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-1" aria-label="Todas las secciones" aria-expanded={open}>
              <span className={`grid h-10 w-10 place-items-center rounded-2xl transition ${open ? "bg-tinta text-papel" : "bg-tinta/5"}`}>
                <Icon name="grid" />
              </span>
              <span className="font-ui text-[11px] font-extrabold">Menú</span>
            </button>
          </div>
        </nav>
      )}
      {!inForm && <div className="h-24 lg:hidden" aria-hidden />}

      {/* menú de mosaicos */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-tinta/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Cerrar el menú" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Secciones del administrador"
              className="absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto rounded-t-[2rem] bg-papel px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-lift"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 120 && setOpen(false)}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-tinta/20" aria-hidden />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-tinta-mute">Hola, {name.split(" ")[0]}</p>
                  <p className="font-heading text-2xl font-extrabold">¿A dónde vamos?</p>
                </div>
                <button onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-tinta/5 text-2xl" aria-label="Cerrar">
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3">
                {items.map((i, k) => {
                  const on = isOn(i);
                  return (
                    <motion.div key={i.href} initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.04 * k, type: "spring", stiffness: 260, damping: 20 }}>
                      <Link
                        href={i.href}
                        onClick={() => setOpen(false)}
                        aria-current={on ? "page" : undefined}
                        className="flex h-full flex-col items-start gap-2 rounded-[1.4rem] border-[3px] p-3 transition active:scale-95"
                        style={{ borderColor: on ? i.color : "transparent", background: `${i.color}${on ? "33" : "17"}` }}
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-2xl text-papel shadow-soft" style={{ background: i.color }}>
                          <Icon name={i.icon} className="h-6 w-6" />
                        </span>
                        <span className="font-heading text-[15px] font-extrabold leading-tight">{i.label}</span>
                        <span className="-mt-1 font-ui text-[11px] font-semibold leading-snug text-tinta-mute">{i.hint}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/historia" className="btn-candy justify-center gap-2 py-3 text-base">
                  <Icon name="eye" /> Ver la historia
                </Link>
                <button onClick={onLogout} className="flex items-center justify-center gap-2 rounded-full border-2 border-tinta/15 font-ui text-sm font-bold text-coral-600">
                  <Icon name="out" /> Cerrar sesión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Tab({ item, on, label }: { item: Item; on: boolean; label?: string }) {
  return (
    <Link href={item.href} aria-current={on ? "page" : undefined} className="flex flex-col items-center gap-1 py-1">
      <motion.span whileTap={{ scale: 0.88 }} className="grid h-10 w-10 place-items-center rounded-2xl transition" style={{ background: on ? item.color : "transparent", color: on ? "#FFFCF5" : item.color }}>
        <Icon name={item.icon} className="h-6 w-6" />
      </motion.span>
      <span className="font-ui text-[11px] font-extrabold" style={{ color: on ? item.color : undefined }}>
        {label ?? item.label}
      </span>
    </Link>
  );
}
