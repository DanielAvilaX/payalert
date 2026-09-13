"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Te avisamos por Telegram antes de que venza cada pago.",
  "Márcalo como pagado desde el mismo mensaje.",
  "Mira en qué se te va la plata cada mes.",
  "Arriendo, servicios, tarjetas y suscripciones, en un solo lugar.",
  "Nunca más un recargo por pagar tarde.",
];

const TYPE_MS = 38;
const DELETE_MS = 22;
const HOLD_MS = 1900;
const GAP_MS = 350;

/**
 * Types each message out letter by letter, holds it, erases it, moves on.
 *
 * The first message is what the server renders, so the loop *starts* by
 * holding it rather than retyping it from nothing - and, as a side effect,
 * every state update happens after an await, never synchronously inside
 * the effect. Reduced-motion users just keep that first message, still.
 */
export function TypewriterRotator({ className }: { className?: string }) {
  const [text, setText] = useState(MESSAGES[0]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    (async () => {
      let index = 0;
      await wait(HOLD_MS);
      while (!cancelled) {
        const current = MESSAGES[index % MESSAGES.length];
        for (let c = current.length - 1; c >= 0 && !cancelled; c--) {
          setText(current.slice(0, c));
          await wait(DELETE_MS);
        }
        await wait(GAP_MS);

        index++;
        const next = MESSAGES[index % MESSAGES.length];
        for (let c = 1; c <= next.length && !cancelled; c++) {
          setText(next.slice(0, c));
          await wait(TYPE_MS);
        }
        await wait(HOLD_MS);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <p className={className}>
      {text}
      <span
        aria-hidden
        className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current align-middle"
      />
    </p>
  );
}
