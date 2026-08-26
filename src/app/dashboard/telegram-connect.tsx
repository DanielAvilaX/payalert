"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { CheckCircle2, ExternalLink, Link2, Unlink } from "lucide-react";
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
      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6 animate-pop-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <Image
            src="/telegram-connect.png"
            alt=""
            width={64}
            height={64}
            className="shrink-0 rounded-full shadow-lg"
          />
          <div>
            <p className="flex items-center gap-2 font-heading text-lg font-medium">
              Telegram conectado
              <CheckCircle2 size={18} className="text-emerald-400" />
            </p>
            <p className="text-sm text-muted">Recibirás tus recordatorios directo en tu chat.</p>
          </div>
        </div>
        <form action={disconnectTelegram}>
          <button
            type="submit"
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 active:scale-95 sm:w-auto"
          >
            <Unlink size={16} />
            Desconectar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6 animate-pop-in sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <Image
          src="/telegram-connect.png"
          alt=""
          width={64}
          height={64}
          className="shrink-0 rounded-full"
        />
        <div>
          <p className="font-heading text-lg font-medium">
            Conecta Telegram para recibir recordatorios.
          </p>
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
