export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Único" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "bimonthly", label: "Bimensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "yearly", label: "Anual" },
];

// Multi-month recurrences can't be pinned down from a bare day-of-month the
// way "monthly" can - day 30 could mean this month, next month, or the one
// after, depending on which one actually starts the user's billing cycle.
// They collect a full date (the next charge date) instead, same as "none",
// and only differ in how many months nextDueDate() advances by from there.
export const FULL_DATE_RECURRENCES = new Set(["none", "bimonthly", "quarterly", "semiannual"]);

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
