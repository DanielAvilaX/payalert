// Kept in lib rather than next to the dashboard components so the pure,
// framework-free modules here (the activity log's change descriptions, for
// one) can read it without importing anything out of app/.
export const RECURRENCE_LABEL: Record<string, string> = {
  none: "Único",
  weekly: "Semanal",
  monthly: "Mensual",
  bimonthly: "Bimensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};
