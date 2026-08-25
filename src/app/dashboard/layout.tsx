import Image from "next/image";
import { Wallet, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

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
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="glass-panel flex items-center justify-between px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
          <span className="font-semibold">PayAlert</span>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-muted underline">
            Salir
          </button>
        </form>
      </header>

      <aside className="glass-panel hidden w-64 shrink-0 flex-col justify-between p-4 md:flex">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2 px-2">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-semibold">PayAlert</span>
          </div>

          <nav className="flex flex-col gap-1">
            <a
              href="#nuevo-pago"
              className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
            >
              <Wallet size={18} />
              Nuevo pago
            </a>
            <a
              href="#tus-pagos"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-foreground"
            >
              <Calendar size={18} />
              Tus pagos
            </a>
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${telegramConnection ? "bg-accent" : "bg-neutral-600"}`}
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
                className="shrink-0 text-xs text-muted underline hover:text-foreground"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
