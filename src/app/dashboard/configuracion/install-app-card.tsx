"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Download, Menu, Share, Smartphone, SquarePlus } from "lucide-react";
import { ModalShell } from "@/app/dashboard/modal-shell";
import { useToast } from "@/app/dashboard/toast-context";

// Not a standard DOM type - Chromium-only, and TypeScript's lib.dom doesn't
// ship it.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Status =
  | "checking"
  | "hidden"
  | "installed"
  | "promptable"
  | "guide-ios"
  | "guide-ios-chrome"
  | "guide-android";

/**
 * What this device can actually do, absent a captured `beforeinstallprompt`
 * (that one arrives async and wins over whatever this returns). Only
 * Chromium browsers on Android ever fire that event - iOS has no installer
 * API at all, by Apple's design, in any browser including Chrome for iOS -
 * so every other mobile browser falls back to its own step-by-step guide.
 */
function detectStatus(): Exclude<Status, "checking" | "promptable"> {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS's own (non-standard) flag for "already added to home screen".
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";

  // iPadOS 13+ reports itself as "Macintosh" but with touch support.
  const isIPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIPad) {
    return /CriOS/.test(ua) ? "guide-ios-chrome" : "guide-ios";
  }
  if (/Android/.test(ua)) return "guide-android";

  // Desktop, or a browser we can't place: "add to home screen" doesn't
  // apply, so the card stays out of the way entirely.
  return "hidden";
}

export function InstallAppCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Deferred rather than a plain synchronous call: `navigator`/`window`
    // aren't available during the server render, so the first paint has to
    // match a state-less "checking" on both sides before this can compute
    // the real answer - same reason the CountUp/Reveal entrance animations
    // above kick off their first setState from a callback, not inline here.
    queueMicrotask(() => setStatus(detectStatus()));

    function onBeforeInstallPrompt(event: Event) {
      // Stops Chrome's own mini-infobar so the only prompt the user sees is
      // the one this button triggers.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setStatus("promptable");
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setStatus("installed");
      toast("¡Listo! PayAlert ya está en tu pantalla de inicio.");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [toast]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    // Chrome only lets a captured prompt be used once either way.
    setDeferredPrompt(null);
    if (choice.outcome !== "accepted") setStatus(detectStatus());
    // On "accepted" the browser's own "appinstalled" event fires next and
    // the listener above takes it from there.
  }

  if (status === "checking" || status === "hidden") return null;

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Smartphone size={18} />
        </span>
        Agregar a la pantalla de inicio
      </h2>
      <p className="mb-4 text-sm text-muted">
        {status === "installed"
          ? "Ya la tienes: ábrela como cualquier otra app, a pantalla completa y sin la barra del navegador."
          : "Ábrela como una app de verdad - a pantalla completa, sin la barra del navegador - directo desde tu pantalla principal."}
      </p>

      {status === "installed" ? (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
          <CheckCircle2 size={16} />
          Instalada en este dispositivo
        </p>
      ) : status === "promptable" ? (
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-[0.98]"
        >
          <Download size={16} />
          Agregar a la pantalla de inicio
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-accent/30 px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent-soft"
        >
          <Share size={16} />
          Ver cómo agregarla
        </button>
      )}

      <InstallGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} status={status} />
    </section>
  );
}

const GUIDE_STEPS: Record<"ios" | "android", ReactNode[]> = {
  ios: [
    <>
      Toca el botón compartir <Share size={14} className="inline align-[-2px]" /> en la barra de Safari.
    </>,
    "Desliza hacia abajo y elige “Agregar a inicio”.",
    "Toca “Agregar” arriba a la derecha.",
  ],
  android: [
    <>
      Toca el menú <Menu size={14} className="inline align-[-2px]" /> arriba a la derecha del navegador.
    </>,
    "Elige “Agregar a pantalla de inicio” o “Instalar app”.",
    "Confirma tocando “Instalar” o “Agregar”.",
  ],
};

function InstallGuideModal({
  open,
  onClose,
  status,
}: {
  open: boolean;
  onClose: () => void;
  status: Status;
}) {
  const steps = status === "guide-android" ? GUIDE_STEPS.android : GUIDE_STEPS.ios;

  return (
    <ModalShell open={open} onClose={onClose} maxWidth="max-w-sm" title="Agregar a la pantalla de inicio">
      {status === "guide-ios-chrome" && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <SquarePlus size={16} className="mt-0.5 shrink-0" />
          Chrome en iPhone no puede instalar apps a la pantalla de inicio - es una limitación de
          Apple, no de PayAlert. Copia este enlace y ábrelo en <b>Safari</b> para poder agregarla.
        </p>
      )}
      <ol className="space-y-3 text-sm">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </ModalShell>
  );
}
