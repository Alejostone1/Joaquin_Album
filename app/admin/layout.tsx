import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/ui";
import { hasRole, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administrador — Joaquín" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("FAMILY");
  return (
    <ToastProvider>
      <div className="min-h-[100svh] bg-papel lg:flex">
        <AdminNav isAdmin={hasRole(user, "ADMIN")} isEditor={hasRole(user, "EDITOR")} name={user.name} />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </div>
    </ToastProvider>
  );
}
