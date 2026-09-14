"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search, Users } from "lucide-react";
import { parseScope, scopeToQuery, type Scope } from "@/lib/scope";
import { personLabel, usePeople } from "@/app/dashboard/sharing-context";
import { Reveal } from "@/app/dashboard/motion";

const MENU_WIDTH = 260;

/**
 * Todos / Solo míos / Compartidos, with a searchable person picker hanging
 * off the last one.
 *
 * The selection lives in the query string rather than in React state: Inicio
 * and Resumen compute their figures on the server, so the filter has to be
 * something the server can read. It also means a filtered view survives a
 * refresh and can be sent to someone as a link.
 */
export function ScopeFilter({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const people = usePeople();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scope = parseScope({
    ambito: params.get("ambito") ?? undefined,
    con: params.get("con") ?? undefined,
  });
  const selectedPerson = people.find((person) => person.id === scope.personId);

  function apply(next: Scope) {
    const query = new URLSearchParams(params.toString());
    query.delete("ambito");
    query.delete("con");
    for (const [key, value] of Object.entries(scopeToQuery(next))) query.set(key, value);
    const search = query.toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  }

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

  // Nobody to share with means every payment is "mine": the filter would be
  // three buttons that all show the same list. It still renders if a stale
  // ?ambito= is in the URL, so a filtered view is never a dead end.
  if (people.length === 0 && scope.kind === "all") return null;

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
      <div
        className={`flex w-fit items-center gap-1 rounded-xl bg-surface-2 p-1 ${pending ? "opacity-60" : ""}`}
      >
      <button type="button" onClick={() => apply({ kind: "all" })} className={`${base} ${scope.kind === "all" ? active : idle}`}>
        Todos
      </button>
      <button type="button" onClick={() => apply({ kind: "mine" })} className={`${base} ${scope.kind === "mine" ? active : idle}`}>
        Solo míos
      </button>

      <div className="flex items-center">
        <button
          type="button"
          onClick={() => apply({ kind: "shared" })}
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
                    apply({ kind: "shared" });
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
                        apply({ kind: "shared", personId: person.id });
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
                      {scope.personId === person.id && <Check size={15} className="shrink-0 text-accent" />}
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
