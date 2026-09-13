export type Payment = {
  id: string;
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

export const RECURRENCE_LABEL: Record<string, string> = {
  none: "Único",
  weekly: "Semanal",
  monthly: "Mensual",
  bimonthly: "Bimensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};

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
