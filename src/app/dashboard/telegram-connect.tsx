"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { BellOff, BellRing, CheckCircle2, ExternalLink, Link2, Unlink } from "lucide-react";
import {
  disconnectTelegram,
  generateTelegramLinkToken,
  setTelegramNotifications,
} from "@/app/dashboard/actions";
import { useToast } from "@/app/dashboard/toast-context";
import { Spinner } from "@/app/dashboard/spinner";

export function TelegramConnect({
  connected,
  notificationsEnabled = true,
}: {
  connected: boolean;
  notificationsEnabled?: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const token = await generateTelegramLinkToken();
      const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
      setLink(`https://t.me/${username}?start=${token}`);
    });
  }

  if (connected) {
    return (
      <div className="card rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                <CheckCircle2 size={18} className="text-emerald-600" />
              </p>
              <p className="text-sm text-muted">Recibirás tus recordatorios directo en tu chat.</p>
            </div>
          </div>
          <form action={disconnectTelegram}>
            <button
              type="submit"
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 active:scale-95 sm:w-auto"
            >
              <Unlink size={16} />
              Desconectar
            </button>
          </form>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <NotificationsToggle enabled={notificationsEnabled} />
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 sm:w-auto"
          >
            <ExternalLink size={16} />
            Abrir en Telegram
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={handleGenerate}
            className="text-xs text-muted underline transition hover:text-foreground disabled:opacity-50"
          >
            {pending ? "Generando..." : "El enlace expiró, generar uno nuevo"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={handleGenerate}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
        >
          {pending ? <Spinner /> : <Link2 size={16} />}
          {pending ? "Generando enlace..." : "Generar enlace de conexión"}
        </button>
      )}
    </div>
  );
}

/**
 * Pausing reminders without unlinking the chat. Disconnecting used to be
 * the only way to stop them, and getting them back means generating a token
 * and opening the bot again - far too much ceremony for "not this week".
 */
function NotificationsToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await setTelegramNotifications(next);
        toast(next ? "Recordatorios activados" : "Recordatorios pausados");
      } catch {
        setOn(!next);
        toast("No pudimos cambiar los recordatorios", "error");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            on ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          {on ? <BellRing size={17} /> : <BellOff size={17} />}
        </span>
        <div>
          <p className="text-sm font-medium">Recordatorios por Telegram</p>
          <p className="text-xs text-muted">
            {on
              ? "Activados: te avisamos antes de cada vencimiento."
              : "Pausados: sigues conectado, pero no te llegarán avisos."}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Recordatorios por Telegram"
        disabled={pending}
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
          on ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            on ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
