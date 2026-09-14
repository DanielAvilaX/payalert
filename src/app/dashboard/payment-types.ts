export type Payment = {
  id: string;
  /** Who created it. Not "who can see it" - that's the owner plus everyone
      on an accepted share (see lib/scope.ts). */
  user_id: string;
  name: string;
  amount: number | null;
  currency: string;
  logo: string | null;
  due_date: string;
  recurrence: string;
  remind_days_before: number;
  is_paid: boolean;
  is_automatic: boolean;
  is_paused: boolean;
  // Added by migration 010. Until it runs these come back undefined, which
  // every reader treats as "off" - so the UI degrades instead of breaking.
  amount_is_variable: boolean;
  notes: string | null;
  payment_url: string | null;
};

// Re-exported from lib so the framework-free modules there (the activity
// log's change descriptions) and the components here read the same labels.
export { RECURRENCE_LABEL } from "@/lib/recurrence";

/**
 * The one ordering every list uses: open bills first by due date (so
 * overdue naturally leads), then paid, then paused at the very bottom -
 * a paused bill is the one thing guaranteed not to need attention.
 */
export function sortPayments(payments: Payment[]): Payment[] {
  const rank = (p: Payment) => (p.is_paused ? 2 : p.is_paid ? 1 : 0);
  return [...payments].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return a.due_date.localeCompare(b.due_date);
  });
}
