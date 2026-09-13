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

/** Axis ticks and tight labels: "$1,5 M", "$850 mil", "$900". */
export function formatCompactCOP(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 1_000) return `$${Math.round(amount / 1_000).toLocaleString("es-CO")} mil`;
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}
