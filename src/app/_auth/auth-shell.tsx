import Image from "next/image";
import type { ReactNode } from "react";
import { Bell, Check, TrendingUp } from "lucide-react";
import { AlertGrid } from "./alert-grid";
import { TypewriterRotator } from "./typewriter-rotator";

// The same light palette and tokens as the dashboard, so signing in feels
// like the first screen of the app rather than a separate site.
export const authLabelClass = "block text-sm font-medium text-foreground";
export const authInputClass = "field mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm";
export const authButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100";
export const authLinkClass = "font-medium text-accent hover:underline";
export const authErrorClass =
  "animate-fade-in-up rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100 ring-inset";
export const authNoticeClass =
  "animate-fade-in-up rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100 ring-inset";

function Brand({ tone }: { tone: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-lg shadow-indigo-500/25">
        <Image src="/logo.png" alt="" width={32} height={32} className="h-full w-full rounded-lg object-contain" />
      </span>
      <span className={`text-xl font-bold tracking-tight ${dark ? "text-white" : "text-foreground"}`}>
        Pay<span className={dark ? "text-indigo-300" : "text-accent"}>Alert</span>
      </span>
    </div>
  );
}

/** A glassy notification floating over the footage - what the app actually sends you. */
function FloatingNotice({
  className,
  delay,
  icon,
  title,
  detail,
}: {
  className: string;
  delay: string;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div aria-hidden className={`animate-chip-in absolute z-10 ${className}`} style={{ animationDelay: delay }}>
      <div
        className="animate-chip-float flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 py-2.5 pr-4 pl-2.5 text-white shadow-2xl shadow-indigo-950/50 backdrop-blur-md"
        style={{ animationDelay: delay }}
      >
        {icon}
        <div className="min-w-0">
          <p className="text-sm leading-tight font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-indigo-100/75">{detail}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * The shared entrance for login, signup and password recovery: footage and
 * brand on the left, the form on the right over a grid of "days" that ping
 * with alerts and payments.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh flex-1 grid-cols-1 bg-background md:grid-cols-2">
      {/* Left: the footage, inset as a rounded panel. Hidden on phones -
          neither the layout nor the download make sense there. The clip is
          desaturated and re-tinted indigo so it carries the brand colour
          instead of reading as generic stock. */}
      <div className="hidden p-3 md:block lg:p-4">
        <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-indigo-950">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/login-poster.jpg"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-70 grayscale"
          >
            <source src="/login-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-indigo-600 mix-blend-color" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_8%,rgba(167,139,250,0.45),transparent_55%)]" />
          <div className="absolute inset-0 bg-linear-to-t from-indigo-950 via-indigo-950/45 to-indigo-950/10" />

          <FloatingNotice
            className="top-[12%] right-6 lg:right-10"
            delay="0.5s"
            icon={
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
                <Image src="/logos/Netflix.png" alt="" width={28} height={28} className="h-full w-full object-contain" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-indigo-950">
                  <Bell size={10} strokeWidth={2.5} />
                </span>
              </span>
            }
            title="Netflix vence mañana"
            detail="$44.900 · Aviso por Telegram"
          />
          <FloatingNotice
            className="top-[31%] left-6 lg:left-10"
            delay="1.1s"
            icon={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Check size={20} strokeWidth={3} />
              </span>
            }
            title="Arriendo pagado"
            detail="Próximo cobro en 30 días"
          />
          <FloatingNotice
            className="top-[49%] right-8 hidden lg:block lg:right-16"
            delay="1.7s"
            icon={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white">
                <TrendingUp size={19} strokeWidth={2.5} />
              </span>
            }
            title="92% a tiempo"
            detail="Cero recargos este mes"
          />

          <div className="relative z-10 flex h-full flex-col justify-end p-8 lg:p-12">
            <div className="mb-5">
              <Brand tone="dark" />
            </div>
            <p className="max-w-sm text-3xl leading-tight font-semibold tracking-tight text-balance text-white">
              Tus pagos, siempre en la mira.
            </p>
            <TypewriterRotator className="mt-3 min-h-[2.5rem] max-w-sm text-sm text-indigo-100/80" />
          </div>
        </div>
      </div>

      {/* Right: the form. */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-10">
        <div
          aria-hidden
          className="animate-blob pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-blob animation-delay-2000 pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl"
        />
        <AlertGrid className="login-grid-mask absolute inset-0 h-full w-full" />

        <div className="animate-fade-in-up relative z-10 w-full max-w-sm">
          {/* On desktop the brand already lives on the footage panel. */}
          <div className="mb-6 flex justify-center md:hidden">
            <Brand tone="light" />
          </div>

          <div className="space-y-5 rounded-3xl border border-border bg-surface/90 p-6 shadow-[0_24px_64px_-24px_rgba(79,70,229,0.35)] backdrop-blur-xl sm:p-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            </div>
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            Recordatorios por Telegram · Hecho para Colombia
          </p>
        </div>
      </div>
    </div>
  );
}
