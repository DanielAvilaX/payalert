"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { buildScopeIndex, MINE_SCOPE, type PaymentScope, type Scope, type ShareLink } from "@/lib/scope";

export type Person = { id: string; name: string | null; email: string | null };

type SharingValue = {
  /** Everyone you share something with, for the "filtrar por persona" picker. */
  people: Person[];
  shares: ShareLink[];
  me: string;
};

const SharingContext = createContext<SharingValue>({ people: [], shares: [], me: "" });

/**
 * Scope lives in React state, not in the URL.
 *
 * It started as a query parameter so the server could read it, which meant
 * every click on Todos/Míos/Compartidos was a full round trip that re-ran
 * the page's database queries - about a second each, and worse when clicks
 * queued up behind one another. Nothing about the filter needs the server:
 * the payments are already in the browser and the filtering is arithmetic.
 * Holding it here also keeps the choice while you move between Inicio,
 * Pagos and Resumen, since this provider outlives those navigations.
 *
 * Starts on "Míos": most people share nothing at first, and even once they
 * do, what's actually yours is the useful default - "Todos" mixes in a
 * roommate's or partner's bills before you've asked to see them.
 */
const ScopeContext = createContext<{ scope: Scope; setScope: (scope: Scope) => void }>({
  scope: MINE_SCOPE,
  setScope: () => {},
});

export function SharingProvider({
  people,
  shares,
  me,
  children,
}: {
  people: Person[];
  shares: ShareLink[];
  me: string;
  children: ReactNode;
}) {
  const [scope, setScope] = useState<Scope>(MINE_SCOPE);
  const sharing = useMemo(() => ({ people, shares, me }), [people, shares, me]);
  const scopeValue = useMemo(() => ({ scope, setScope }), [scope]);

  return (
    <SharingContext.Provider value={sharing}>
      <ScopeContext.Provider value={scopeValue}>{children}</ScopeContext.Provider>
    </SharingContext.Provider>
  );
}

export function usePeople() {
  return useContext(SharingContext).people;
}

export function useScope() {
  return useContext(ScopeContext);
}

/** Ownership and company for the payments a given screen is showing. */
export function useScopeIndex(payments: Array<{ id: string; user_id: string }>) {
  const { shares, me } = useContext(SharingContext);
  return useMemo<Map<string, PaymentScope>>(
    () => buildScopeIndex(payments, shares, me),
    [payments, shares, me]
  );
}

export function personLabel(person: Person | undefined): string {
  if (!person) return "Alguien";
  return person.name?.trim() || person.email || "Alguien";
}
