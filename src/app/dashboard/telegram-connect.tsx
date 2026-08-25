"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import {
  disconnectTelegram,
  generateTelegramLinkToken,
} from "@/app/dashboard/actions";

export function TelegramConnect({ connected }: { connected: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (connected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Send size={18} />
          </div>
          <p className="text-sm">Telegram conectado — recibirás tus recordatorios ahí.</p>
        </div>
        <form action={disconnectTelegram}>
          <button type="submit" className="text-sm text-red-400 hover:underline">
            Desconectar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Send size={22} />
        </div>
        <div>
          <p className="font-medium">Conecta Telegram para recibir recordatorios.</p>
          <p className="text-sm text-muted">
            Genera tu enlace de conexión y ábrelo en Telegram para empezar a recibir alertas.
          </p>
        </div>
      </div>

      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-black hover:bg-accent-dark"
        >
          Abrir en Telegram
        </a>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const token = await generateTelegramLinkToken();
              const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
              setLink(`https://t.me/${username}?start=${token}`);
            })
          }
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-dark disabled:opacity-50"
        >
          {pending ? "Generando enlace..." : "Generar enlace de conexión"}
        </button>
      )}
    </div>
  );
}
