export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Único" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "bimonthly", label: "Bimensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "yearly", label: "Anual" },
];

// These all collect the same "day of month" field as "monthly" - they only
// differ in how many months nextDueDate() advances by on rollover.
export const MONTHLY_LIKE_RECURRENCES = new Set(["monthly", "bimonthly", "quarterly", "semiannual"]);

export const WEEKDAY_OPTIONS = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

export const MONTH_OPTIONS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
].map((label, i) => ({ value: String(i + 1), label }));
