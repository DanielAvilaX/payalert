"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Person = { id: string; name: string | null; email: string | null };

/** Everyone you share something with, resolved once in the dashboard layout. */
const PeopleContext = createContext<Person[]>([]);

export function PeopleProvider({ people, children }: { people: Person[]; children: ReactNode }) {
  return <PeopleContext.Provider value={people}>{children}</PeopleContext.Provider>;
}

export function usePeople() {
  return useContext(PeopleContext);
}

export function personLabel(person: Person | undefined): string {
  if (!person) return "Alguien";
  return person.name?.trim() || person.email || "Alguien";
}
