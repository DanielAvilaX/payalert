"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Trash2,
  UserMinus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { colombiaTime, colombiaToday } from "@/lib/dates";
import { describeActivity, type ActivityAction, type ActivityDetails } from "@/lib/activity";
import { formatDueDate } from "@/lib/payment-status";
import { Reveal } from "@/app/dashboard/motion";

export type ActivityEntry = {
  id: string;
  paymentId: string | null;
  paymentName: string;
  actorName: string;
  action: ActivityAction;
  details: ActivityDetails | null;
  createdAt: string;
};

const ICON: Record<ActivityAction, { icon: LucideIcon; className: string }> = {
  created: { icon: Plus, className: "bg-accent-soft text-accent" },
  updated: { icon: Pencil, className: "bg-accent-soft text-accent" },
  paid: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600" },
  unpaid: { icon: RotateCcw, className: "bg-amber-50 text-amber-600" },
  paused: { icon: Pause, className: "bg-slate-100 text-slate-600" },
  resumed: { icon: Play, className: "bg-slate-100 text-slate-600" },
  deleted: { icon: Trash2, className: "bg-red-50 text-red-600" },
  rolled_over: { icon: Repeat, className: "bg-slate-100 text-slate-600" },
  shared: { icon: Users, className: "bg-accent-soft text-accent" },
  share_accepted: { icon: Users, className: "bg-emerald-50 text-emerald-600" },
  share_rejected: { icon: UserMinus, className: "bg-amber-50 text-amber-600" },
  share_revoked: { icon: UserMinus, className: "bg-red-50 text-red-600" },
  share_left: { icon: UserMinus, className: "bg-amber-50 text-amber-600" },
};

const FILTERS = [
  { key: "all", label: "Todo", actions: null },
  { key: "money", label: "Pagos", actions: ["paid", "unpaid"] },
  {
    key: "edits",
    label: "Cambios",
    actions: ["created", "updated", "deleted", "paused", "resumed", "rolled_over"],
  },
  {
    key: "sharing",
    label: "Compartir",
    actions: ["shared", "share_accepted", "share_rejected", "share_revoked", "share_left"],
  },
] as const;

function dayLabel(dayISO: string, todayStr: string): string {
  if (dayISO === todayStr) return "Hoy";
  const [y, m, d] = todayStr.split("-").map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  if (dayISO === yesterday) return "Ayer";
  return formatDueDate(dayISO, true);
}

/**
 * Who did what, newest first. Once several people can edit, settle and
 * delete the same payment, this is the only place that can answer "it says
 * paid and it wasn't me".
 */
export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const needle = query.trim().toLowerCase();
  const active = FILTERS.find((option) => option.key === filter)!;
  const visible = entries.filter((entry) => {
    if (active.actions && !(active.actions as readonly string[]).includes(entry.action)) return false;
    if (!needle) return true;
    return (
      entry.paymentName.toLowerCase().includes(needle) ||
      entry.actorName.toLowerCase().includes(needle)
    );
  });

  const todayStr = colombiaToday();
  const days: Array<{ day: string; items: ActivityEntry[] }> = [];
  for (const entry of visible) {
    const day = colombiaToday(new Date(entry.createdAt));
    const last = days.at(-1);
    if (last && last.day === day) last.items.push(entry);
    else days.push({ day, items: [entry] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filtrar historial" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
          {FILTERS.map((option) => {
            const selected = option.key === filter;
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(option.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  selected ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="relative lg:w-72">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por pago o persona..."
            aria-label="Buscar en el historial"
            className="field w-full rounded-xl py-2.5 pr-3 pl-9 text-sm"
          />
        </div>
      </div>

      {days.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-sm font-medium">
            {entries.length === 0 ? "Todavía no hay movimientos." : "Nada coincide con esa búsqueda."}
          </p>
          <p className="mt-1 text-sm text-muted">
            {entries.length === 0
              ? "Aquí aparecerá quién agrega, edita, paga o comparte cada pago."
              : "Prueba con otra palabra o cambia el filtro."}
          </p>
        </div>
      ) : (
        days.map(({ day, items }, dayIndex) => (
          <Reveal key={day} delay={Math.min(dayIndex * 60, 240)} className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-muted">{dayLabel(day, todayStr)}</h2>
            <ul className="card divide-y divide-border">
              {items.map((entry) => {
                const { verb, lines } = describeActivity(entry.action, entry.details);
                const { icon: Icon, className } = ICON[entry.action];
                const body = (
                  <>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm break-words">
                        <b className="font-semibold">{entry.actorName}</b> {verb}{" "}
                        <span className="font-medium">{entry.paymentName}</span>
                      </span>
                      {lines.map((line, i) => (
                        <span key={i} className="block text-xs text-muted">
                          {line}
                        </span>
                      ))}
                    </span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {colombiaTime(new Date(entry.createdAt))}
                    </span>
                  </>
                );

                return (
                  <li key={entry.id}>
                    {entry.paymentId ? (
                      <Link
                        href={`/dashboard/pagos?pago=${entry.paymentId}`}
                        prefetch={false}
                        className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-2"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ))
      )}
    </div>
  );
}
