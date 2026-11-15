"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BubbleWord } from "@/components/ui/BubbleWord";
import { Footprint } from "@/components/ui/Watercolor";

const ITEMS = [
  { href: "/admin", label: "Inicio", color: "#2BA36B", exact: true },
  { href: "/admin/biblioteca", label: "Fotos y videos", color: "#1FB5B0" },
  { href: "/admin/recuerdos", label: "Recuerdos", color: "#FF8A7A" },
  { href: "/admin/linea-de-tiempo", label: "Línea de tiempo", color: "#F2A516" },
  { href: "/admin/nacimiento", label: "Nacimiento", color: "#E86A9A" },
  { href: "/admin/etapas", label: "Etapas", color: "#3C9BE0" },
  { href: "/admin/cartas", label: "Cartas", color: "#FF9F68" },
  { href: "/admin/escenas", label: "Capítulos", color: "#2F5D47" },
  { href: "/admin/usuarios", label: "Personas", color: "#9B7BE0", admin: true },
  { href: "/admin/cuenta", label: "Mi cuenta", color: "#6E8075" },
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
          {items.map((i, k) => {
            const on = i.exact ? path === i.href : path.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 font-heading text-[17px] font-bold transition" style={{ background: on ? `${i.color}22` : undefined }}>
                <Footprint className={`h-5 w-5 transition ${on ? "scale-110" : "opacity-40 group-hover:opacity-100"}`} color={i.color} style={{ rotate: `${k % 2 ? 14 : -14}deg` }} />
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
      {/* móvil */}
      <div className="sticky top-0 z-30 border-b-2 border-tinta/10 bg-salvia-50/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <Link href="/admin">
            <BubbleWord text="Joaquín" className="text-2xl" animate={false} />
          </Link>
          <Link href="/historia" className="btn-soft py-1.5 text-xs">
            Ver la historia
          </Link>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2" aria-label="Secciones del administrador">
          {items.map((i) => {
            const on = i.exact ? path === i.href : path.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href} className="shrink-0 rounded-full px-3 py-1.5 font-ui text-sm font-bold" style={{ background: on ? i.color : undefined, color: on ? "#FFFCF5" : undefined }}>
                {i.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
