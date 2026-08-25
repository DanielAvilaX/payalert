import Image from "next/image";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { SidebarNav } from "@/app/dashboard/sidebar-nav";
import { MobileNav } from "@/app/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: telegramConnection } = await supabase
    .from("telegram_connections")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <header className="glass-panel sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="font-heading text-lg font-semibold">PayAlert</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground active:scale-95"
          >
            <LogOut size={14} />
            Salir
          </button>
        </form>
      </header>

      <aside className="glass-panel fixed inset-y-0 left-0 z-20 hidden w-72 shrink-0 flex-col justify-between p-5 md:flex">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2.5 px-2">
            <Image src="/logo.png" alt="" width={40} height={40} className="rounded-xl" />
            <span className="font-heading text-xl font-semibold">PayAlert</span>
          </div>

          <SidebarNav />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${telegramConnection ? "bg-accent" : "bg-neutral-600"}`}
            />
            <span className="text-muted">
              {telegramConnection ? "Telegram conectado" : "Telegram sin conectar"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="truncate text-xs text-muted">{user?.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1 text-xs text-muted transition hover:text-foreground active:scale-95"
              >
                <LogOut size={14} />
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="px-4 py-8 pb-24 md:ml-72 md:px-10 md:pb-8">{children}</main>

      <MobileNav />
    </div>
  );
}
