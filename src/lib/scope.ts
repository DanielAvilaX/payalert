// Framework-free and imported relatively, like the rest of src/lib, so the
// test runner can load it directly.

/** Who a list is being looked at through: everything, what you own, or what's shared. */
export type Scope = {
  kind: "all" | "mine" | "shared";
  /** Within "shared": narrow to the payments involving this one person. */
  personId?: string | null;
};

export const ALL_SCOPE: Scope = { kind: "all" };

export type ShareLink = {
  payment_id: string;
  shared_with: string;
  invited_by: string;
  status: string;
};

type OwnedPayment = { id: string; user_id: string };

export type PaymentScope = {
  /** I created it - whether or not I have since let anyone else in. */
  mine: boolean;
  /** Everyone *other than me* with access: the owner when that isn't me, plus accepted shares. */
  people: string[];
};

/**
 * Ownership and company for each payment, from my point of view.
 *
 * Pending and rejected invitations deliberately don't count as company. An
 * invitation nobody has answered yet grants no access and sends no
 * reminders, so treating it as "shared" would file the payment under a
 * collaboration that doesn't exist yet.
 */
export function buildScopeIndex<T extends OwnedPayment>(
  payments: T[],
  shares: ShareLink[],
  me: string
): Map<string, PaymentScope> {
  const index = new Map<string, PaymentScope>();
  for (const payment of payments) {
    index.set(payment.id, {
      mine: payment.user_id === me,
      people: payment.user_id === me ? [] : [payment.user_id],
    });
  }

  for (const share of shares) {
    if (share.status !== "accepted") continue;
    const entry = index.get(share.payment_id);
    if (!entry) continue;
    if (share.shared_with !== me && !entry.people.includes(share.shared_with)) {
      entry.people.push(share.shared_with);
    }
  }

  return index;
}

/**
 * "Míos" and "Compartidos" overlap on purpose rather than splitting the
 * list in two: a bill you created and then shared is still yours, so it
 * belongs in both. The only thing "Míos" takes away is what somebody else
 * brought to you.
 */
export function matchesScope(
  paymentId: string | null,
  scope: Scope,
  index: Map<string, PaymentScope>
): boolean {
  if (scope.kind === "all") return true;

  // A completion whose payment was deleted is only ever visible to the
  // payment's owner, so it can only answer "mine".
  const entry = paymentId === null ? null : index.get(paymentId);
  if (!entry) return scope.kind === "mine";

  if (scope.kind === "mine") return entry.mine;
  return scope.personId ? entry.people.includes(scope.personId) : entry.people.length > 0;
}

export function filterPaymentsByScope<T extends { id: string }>(
  payments: T[],
  scope: Scope,
  index: Map<string, PaymentScope>
): T[] {
  if (scope.kind === "all") return payments;
  return payments.filter((payment) => matchesScope(payment.id, scope, index));
}

export function filterEventsByScope<T extends { payment_id: string | null }>(
  events: T[],
  scope: Scope,
  index: Map<string, PaymentScope>
): T[] {
  if (scope.kind === "all") return events;
  return events.filter((event) => matchesScope(event.payment_id, scope, index));
}

/** Every person you share anything with, for the "filtrar por persona" picker. */
export function peopleInScope(index: Map<string, PaymentScope>): string[] {
  const people = new Set<string>();
  for (const entry of index.values()) {
    for (const person of entry.people) people.add(person);
  }
  return [...people];
}
