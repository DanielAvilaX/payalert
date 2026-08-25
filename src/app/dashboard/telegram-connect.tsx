"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ExternalLink, Link2, Unlink } from "lucide-react";
import {
  disconnectTelegram,
  generateTelegramLinkToken,
} from "@/app/dashboard/actions";
import { Spinner } from "@/app/dashboard/spinner";

export function TelegramConnect({ connected }: { connected: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (connected) {
    return (
      <div className="glass-panel flex items-center justify-between rounded-xl p-4 animate-pop-in">
        <div className="flex items-center gap-3">
          <Image
            src="/telegram-connect.png"
            alt=""
            width={40}
            height={40}
            className="rounded-full"
          />
          <p className="text-sm">Telegram conectado — recibirás tus recordatorios ahí.</p>
        </div>
        <form action={disconnectTelegram}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-red-400 hover:underline"
          >
            <Unlink size={14} />
            Desconectar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-xl p-5 animate-pop-in sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Image
          src="/telegram-connect.png"
          alt=""
          width={52}
          height={52}
          className="shrink-0 rounded-full"
        />
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
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95"
        >
          <ExternalLink size={16} />
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
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
        >
          {pending ? <Spinner /> : <Link2 size={16} />}
          {pending ? "Generando enlace..." : "Generar enlace de conexión"}
        </button>
      )}
    </div>
  );
}
