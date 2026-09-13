import Image from "next/image";
import type { ReactNode } from "react";
import { LoginNetwork } from "./login-network";
import { TypewriterRotator } from "./typewriter-rotator";

// Always dark on purpose, whatever the rest of the app or the OS theme is:
// the entrance should look identical on every machine, so nothing here uses
// a `dark:` variant or the app's theme tokens - the colours are literal.
export const authLabelClass = "block text-sm font-medium text-zinc-300";
export const authInputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 transition-colors placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-900/40";
export const authButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-indigo-600 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100";
export const authLinkClass = "font-medium text-indigo-400 hover:underline";
export const authErrorClass =
  "animate-fade-in-up rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300";
export const authNoticeClass =
  "animate-fade-in-up rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300";

function Brand({ onDark = true }: { onDark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-lg shadow-indigo-500/30">
        <Image src="/logo.png" alt="PayAlert" width={28} height={28} className="h-full w-full rounded-lg object-contain" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${onDark ? "text-white" : "text-zinc-50"}`}>
        Pay
        <span className="bg-linear-to-r from-indigo-400 to-violet-300 bg-clip-text text-transparent">
          Alert
        </span>
      </span>
    </div>
  );
}

/**
 * The shared entrance for login, signup and password recovery - the same
 * composition as the Job Hunter AI login: footage on the left, the form on
 * the right over drifting colour and a cursor-reactive node network.
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
    <div className="grid min-h-dvh flex-1 grid-cols-1 bg-zinc-950 md:grid-cols-2">
      {/* Left: the footage. Hidden on phones - neither the layout nor the
          download make sense on a narrow screen. Muted and looping, under
          two gradients so it reads as atmosphere rather than the subject.
          The clip was shot on pure black, so the panel edge has no seam. */}
      <div className="relative hidden overflow-hidden bg-zinc-950 md:block">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/login-poster.jpg"
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        >
          <source src="/login-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-linear-to-r from-zinc-950/20 via-zinc-950/60 to-zinc-950" />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/10 to-violet-950/50" />

        <div className="relative z-10 flex h-full flex-col justify-end p-10 lg:p-14">
          <div className="mb-5">
            <Brand />
          </div>
          <p className="max-w-sm text-2xl leading-snug font-semibold text-balance text-white">
            Tus pagos, siempre en la mira.
          </p>
          <TypewriterRotator className="mt-2 min-h-[2.5rem] max-w-sm text-sm text-zinc-300" />
        </div>
      </div>

      {/* Right: the form. */}
      <div className="relative flex items-center justify-center overflow-hidden bg-linear-to-br from-zinc-950 via-zinc-950 to-indigo-950/40 p-4 py-10">
        <div
          aria-hidden
          className="animate-blob pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-indigo-700/20 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-blob animation-delay-2000 pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-violet-700/20 blur-3xl"
        />
        {/* Fades out toward the footage panel so it never competes with the
            form, and is most present toward the outer right edge. */}
        <LoginNetwork className="login-net-mask pointer-events-none absolute inset-0 h-full w-full" />

        <div className="animate-fade-in-up relative z-10 w-full max-w-sm">
          {/* On desktop the brand already lives on the footage panel. */}
          <div className="mb-6 flex justify-center md:hidden">
            <Brand onDark={false} />
          </div>

          <div className="w-full space-y-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/80 p-6 shadow-xl shadow-indigo-900/5 backdrop-blur-xl">
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
              <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
