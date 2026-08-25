"use client";

import { useState, useTransition } from "react";
import {
  disconnectTelegram,
  generateTelegramLinkToken,
} from "@/app/dashboard/actions";

export function TelegramConnect({ connected }: { connected: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (connected) {
    return (
      <div className="flex items-center gap-3 rounded border p-3">
        <span className="text-sm">✅ Telegram conectado</span>
        <form action={disconnectTelegram}>
          <button type="submit" className="text-sm text-red-600 underline">
            Desconectar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <p className="text-sm">Conecta Telegram para recibir recordatorios.</p>

      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="w-fit rounded bg-black px-3 py-1.5 text-sm text-white"
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
          className="w-fit rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Generando enlace..." : "Generar enlace de conexión"}
        </button>
      )}
    </div>
  );
}
