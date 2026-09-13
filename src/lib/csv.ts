type Cell = string | number | null | undefined;

/**
 * Semicolon-separated on purpose: Excel set to Spanish (comma as the decimal
 * mark, as in Colombia) splits on semicolons, so a comma CSV opens as one
 * crammed column.
 */
export function toCSV(rows: Cell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(";")).join("\r\n");
}

function escapeCell(cell: Cell): string {
  if (cell == null) return "";
  let text = String(cell);
  // Formula injection: a note or payment name like "=HYPERLINK(...)" would
  // be executed by the spreadsheet the moment the export is opened. Only
  // text is guarded - a negative number is a number, not a formula.
  if (typeof cell === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}
