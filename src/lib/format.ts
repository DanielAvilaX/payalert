export function formatMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return `$${Number(digits).toLocaleString("es-CO")}`;
}

export function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** "$1.775.000" - pesos without decimals, which nobody pays bills in. */
export function formatCOP(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `$${Math.round(Number(amount)).toLocaleString("es-CO")}`;
}
