// Framework-free and imported relatively, like the rest of src/lib, so the
// test runner can load it directly.

/** Who a list is being looked at through: everything, only what's yours alone, or what's shared. */
export type Scope = {
  kind: "all" | "mine" | "shared";
  /** Within "shared": narrow to the payments involving this one person. */
  personId?: string | null;
};

export const ALL_SCOPE: Scope = { kind: "all" };

/** The query string the filter reads and writes: ?ambito=mios / ?ambito=compartidos&con=<id> */
export function parseScope(params: {
  ambito?: string | string[];
  con?: string | string[];
}): Scope {
  const kind = typeof params.ambito === "string" ? params.ambito : "";
  const person = typeof params.con === "string" ? params.con : "";
  if (kind === "mios") return { kind: "mine" };
  if (kind === "compartidos") return { kind: "shared", personId: person || null };
  return ALL_SCOPE;
}

export function scopeToQuery(scope: Scope): Record<string, string> {
  if (scope.kind === "mine") return { ambito: "mios" };
  if (scope.kind === "shared") {
    return scope.personId
      ? { ambito: "compartidos", con: scope.personId }
      : { ambito: "compartidos" };
  }
  return {};
}

export type ShareLink = {
  payment_id: string;
  shared_with: string;
  invited_by: string;
  status: string;
};

type OwnedPayment = { id: string; user_id: string };

/**
 * Everyone *other than me* who is on each payment: its owner when that
 * isn't me, plus everyone whose invitation was accepted.
 *
 * Pending and rejected invitations deliberately don't count. An invitation
 * nobody has answered yet gives no access and sends no reminders, so
 * treating it as "shared" would file the payment under a collaboration
 * that doesn't exist yet.
 */
export function collaboratorsByPayment<T extends OwnedPayment>(
  payments: T[],
  shares: ShareLink[],
  me: string
): Map<string, string[]> {
  const byPayment = new Map<string, string[]>();
  for (const payment of payments) {
    byPayment.set(payment.id, payment.user_id === me ? [] : [payment.user_id]);
  }

  for (const share of shares) {
    if (share.status !== "accepted") continue;
    const people = byPayment.get(share.payment_id);
    if (!people) continue;
    if (share.shared_with !== me && !people.includes(share.shared_with)) {
      people.push(share.shared_with);
    }
  }

  return byPayment;
}

/**
 * "Todos", "Solo míos" and "Compartidos" partition the list rather than
 * overlap: a bill you own but share with someone belongs to the shared
 * half, because that's the question being asked - "what is just mine?"
 */
export function matchesScope(
  paymentId: string | null,
  scope: Scope,
  collaborators: Map<string, string[]>
): boolean {
  if (scope.kind === "all") return true;
  // A completion whose payment was deleted has no collaborators left to
  // read, so it can only ever answer "mine".
  const people = paymentId === null ? [] : (collaborators.get(paymentId) ?? []);
  if (scope.kind === "mine") return people.length === 0;
  return scope.personId ? people.includes(scope.personId) : people.length > 0;
}

export function filterPaymentsByScope<T extends { id: string }>(
  payments: T[],
  scope: Scope,
  collaborators: Map<string, string[]>
): T[] {
  if (scope.kind === "all") return payments;
  return payments.filter((payment) => matchesScope(payment.id, scope, collaborators));
}

export function filterEventsByScope<T extends { payment_id: string | null }>(
  events: T[],
  scope: Scope,
  collaborators: Map<string, string[]>
): T[] {
  if (scope.kind === "all") return events;
  return events.filter((event) => matchesScope(event.payment_id, scope, collaborators));
}

/** Every person you share anything with, for the "filtrar por persona" picker. */
export function peopleInScope(collaborators: Map<string, string[]>): string[] {
  const people = new Set<string>();
  for (const list of collaborators.values()) {
    for (const person of list) people.add(person);
  }
  return [...people];
}
