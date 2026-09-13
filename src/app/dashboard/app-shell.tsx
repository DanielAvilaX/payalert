"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  House,
  LogOut,
  Receipt,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { PageMotionProvider } from "@/app/dashboard/motion";

export type ShellNotification = {
  id: string;
  name: string;
  label: string;
  tone: "overdue" | "today" | "soon";
};

type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

// Perfil stays out of the bottom bar - four targets is the comfortable limit
// at phone width - and is reached from the avatar menu instead.
const NAV: NavItem[] = [
  { href: "/dashboard/inicio", label: "Inicio", short: "Inicio", icon: House },
  { href: "/dashboard/pagos", label: "Pagos", short: "Pagos", icon: Receipt },
  { href: "/dashboard/resumen", label: "Resumen", short: "Resumen", icon: BarChart3 },
  { href: "/dashboard/configuracion", label: "Configuración", short: "Ajustes", icon: Settings },
  { href: "/dashboard/perfil", label: "Perfil", short: "Perfil", icon: UserRound },
];

const MOBILE_TITLES: Record<string, string> = {
  "/dashboard/inicio": "Inicio",
  "/dashboard/pagos": "Mis Pagos",
  "/dashboard/resumen": "Resumen",
  "/dashboard/configuracion": "Configuración",
  "/dashboard/perfil": "Perfil",
};

const TONE_DOT: Record<ShellNotification["tone"], string> = {
  overdue: "bg-red-500",
  today: "bg-red-500",
  soon: "bg-amber-500",
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Closes a popover on an outside click or Escape. */
function useDismiss(open: boolean, setOpen: (value: boolean) => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen, ref]);
}

/**
 * The redesign's frame: a fixed sidebar and a top bar with notifications and
 * the account menu on desktop; a titled header and a bottom tab bar on
 * phones. Every nav link keeps prefetch={false} - these routes are fully
 * dynamic, and prefetching them is what once hung the browser's load event
 * for over a minute.
 */
export function AppShell({
  userName,
  userEmail,
  telegramConnected,
  notifications,
  children,
}: {
  userName: string;
  userEmail: string;
  telegramConnected: boolean;
  notifications: ShellNotification[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const mobileTitle =
    Object.entries(MOBILE_TITLES).find(([href]) => isActive(pathname, href))?.[1] ?? "PayAlert";

  return (
    <>
      <Sidebar pathname={pathname} telegramConnected={telegramConnected} />

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
          <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
            <Link
              href="/dashboard/inicio"
              prefetch={false}
              aria-label="PayAlert, ir al inicio"
              className="lg:hidden"
            >
              <Image src="/logo.png" alt="" width={30} height={30} className="rounded-lg" />
            </Link>
            <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold whitespace-nowrap lg:hidden">
              {mobileTitle}
            </p>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationBell items={notifications} />
              <UserMenu name={userName} email={userEmail} />
            </div>
          </div>
        </header>

        <PageMotionProvider pathname={pathname}>
          <main
            key={pathname}
            className="animate-view-in mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12"
          >
            {children}
          </main>
        </PageMotionProvider>
      </div>

      <BottomNav pathname={pathname} />
    </>
  );
}

function Sidebar({ pathname, telegramConnected }: { pathname: string; telegramConnected: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <Link href="/dashboard/inicio" prefetch={false} className="flex h-16 items-center gap-2.5 px-6">
        <Image src="/logo.png" alt="" width={34} height={34} className="rounded-xl" />
        <span className="text-lg font-bold tracking-tight">PayAlert</span>
      </Link>

      <nav aria-label="Principal" className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <Link
          href="/dashboard/configuracion"
          prefetch={false}
          className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-xs transition hover:bg-surface-2"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${telegramConnected ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          <span className="text-muted">
            {telegramConnected ? "Telegram conectado" : "Telegram sin conectar"}
          </span>
        </Link>
      </div>
    </aside>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {NAV.slice(0, 4).map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition ${
                  active ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NotificationBell({ items }: { items: ShellNotification[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, setOpen, ref);

  // The badge counts only what needs action today; "due in 3 days" is
  // listed inside but doesn't earn a red number on every page.
  const urgent = items.filter((item) => item.tone !== "soon").length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={urgent ? `Notificaciones: ${urgent} urgentes` : "Notificaciones"}
        aria-expanded={open}
        className="relative rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-foreground"
      >
        <Bell size={20} />
        {urgent > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-surface">
            {urgent}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-pop-in absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-2 shadow-xl">
          <p className="px-3 pt-2 pb-1 text-sm font-semibold">Notificaciones</p>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Todo al día. No tienes pagos urgentes.
            </p>
          ) : (
            <ul className="scrollbar-thin max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/pagos?pago=${item.id}`}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium break-words">{item.name}</span>
                      <span className="block text-xs text-muted">{item.label}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, setOpen, ref);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Menú de la cuenta"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-surface-2 sm:pr-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
          {initialsOf(name)}
        </span>
        <span className="hidden max-w-40 text-sm font-medium break-words sm:block">{name}</span>
        <ChevronDown size={16} className="hidden text-muted sm:block" />
      </button>

      {open && (
        <div className="animate-pop-in absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
          <div className="border-b border-border px-3 pt-2 pb-2.5">
            <p className="text-sm font-medium break-words">{name}</p>
            <p className="text-xs break-all text-muted">{email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard/perfil"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-surface-2"
            >
              <UserRound size={16} className="text-muted" />
              Perfil
            </Link>
            <Link
              href="/dashboard/configuracion"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-surface-2"
            >
              <Settings size={16} className="text-muted" />
              Configuración
            </Link>
          </div>
          <form action={logout} className="border-t border-border pt-1">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
