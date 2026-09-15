"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, Users } from "lucide-react";
import { personLabel, usePeople, useScope } from "@/app/dashboard/sharing-context";
import { Reveal } from "@/app/dashboard/motion";

const MENU_WIDTH = 260;

/**
 * Todos / Míos / Compartidos, with a searchable person picker hanging off
 * the last one. Switching is instant: the choice is React state and every
 * screen that reads it filters data it already has, so nothing goes to the
 * network.
 */
export function ScopeFilter({ className = "" }: { className?: string }) {
  const people = usePeople();
  const { scope, setScope } = useScope();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedPerson = people.find((person) => person.id === scope.personId);

  useEffect(() => {
    if (!open) return;

    function position() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPlacement({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      });
    }
    position();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", position);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", position);
    };
  }, [open]);

  // Nobody to share with means "mine" and "all" show the same list, so the
  // filter would be three buttons with nothing to actually choose between.
  // Left visible for "shared" so a stale selection (someone just removed)
  // still has a way back to "Míos".
  if (people.length === 0 && scope.kind !== "shared") return null;

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? people.filter(
        (person) =>
          (person.name ?? "").toLowerCase().includes(needle) ||
          (person.email ?? "").toLowerCase().includes(needle)
      )
    : people;

  const isShared = scope.kind === "shared";
  const base = "rounded-lg px-3 py-2 text-sm font-medium transition whitespace-nowrap";
  const active = "bg-accent text-white shadow-sm";
  const idle = "text-muted hover:text-foreground";

  return (
    <Reveal
      delay={40}
      // Owns its own scroll container so that hiding it (nothing shared yet)
      // leaves no empty gap behind in the page's vertical rhythm.
      className={`scrollbar-thin -mx-1 overflow-x-auto px-1 pb-1 ${className}`}
    >
      <div className="flex w-fit items-center gap-1 rounded-xl bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setScope({ kind: "all" })}
          className={`${base} ${scope.kind === "all" ? active : idle}`}
        >
          Todos
        </button>
        {/* "Míos", not "Solo míos": it keeps everything you created, including
            what you have shared out - the only thing it drops is what someone
            else shared with you. */}
        <button
          type="button"
          onClick={() => setScope({ kind: "mine" })}
          title="Los pagos que creaste tú, aunque los hayas compartido"
          className={`${base} ${scope.kind === "mine" ? active : idle}`}
        >
          Míos
        </button>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setScope({ kind: "shared" })}
            className={`${base} ${isShared ? `${active} rounded-r-none` : idle}`}
          >
            <span className="flex items-center gap-1.5">
              <Users size={15} />
              {selectedPerson ? personLabel(selectedPerson) : "Compartidos"}
            </span>
          </button>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Filtrar por persona"
            className={`rounded-lg py-2 pr-2 pl-1 transition ${isShared ? `${active} rounded-l-none` : idle}`}
          >
            <ChevronDown size={15} />
          </button>
        </div>

        {open &&
          placement &&
          createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={{ position: "fixed", width: MENU_WIDTH, ...placement }}
              className="animate-pop-in z-[200] rounded-xl border border-border bg-surface p-1.5 shadow-xl"
            >
              {people.length === 0 ? (
                <p className="px-2.5 py-3 text-center text-sm text-muted">
                  Todavía no compartes pagos con nadie.
                </p>
              ) : (
                <>
                  <div className="relative mb-1.5">
                    <Search
                      size={14}
                      className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-subtle"
                    />
                    <input
                      autoFocus
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar persona..."
                      aria-label="Buscar persona"
                      className="field w-full rounded-lg py-1.5 pr-2 pl-7 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setScope({ kind: "shared" });
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-2"
                  >
                    Todos los compartidos
                    {isShared && !scope.personId && <Check size={15} className="text-accent" />}
                  </button>
                  <div className="scrollbar-thin max-h-56 overflow-y-auto">
                    {visible.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setScope({ kind: "shared", personId: person.id });
                          setOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{personLabel(person)}</span>
                          {person.name && person.email && (
                            <span className="block truncate text-xs text-muted">{person.email}</span>
                          )}
                        </span>
                        {scope.personId === person.id && (
                          <Check size={15} className="shrink-0 text-accent" />
                        )}
                      </button>
                    ))}
                    {visible.length === 0 && (
                      <p className="px-2.5 py-3 text-center text-sm text-muted">Sin coincidencias.</p>
                    )}
                  </div>
                </>
              )}
            </div>,
            document.body
          )}
      </div>
    </Reveal>
  );
}
