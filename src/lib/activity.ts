// Framework-free and imported relatively, like the rest of src/lib, so the
// test runner can load it directly.
import { formatCOP } from "./format.ts";
import { formatDueDate } from "./payment-status.ts";
import { RECURRENCE_LABEL } from "./recurrence.ts";

export type ActivityAction =
  | "created"
  | "updated"
  | "paid"
  | "unpaid"
  | "paused"
  | "resumed"
  | "deleted"
  | "rolled_over"
  | "shared"
  | "share_accepted"
  | "share_rejected"
  | "share_revoked"
  | "share_left";

export type FieldChange = { from: unknown; to: unknown };

export type ActivityDetails = {
  changes?: Record<string, FieldChange>;
  amount?: number | null;
  dueDate?: string;
  nextDueDate?: string;
  /** The other side of a share: a name when we have one, otherwise the email. */
  person?: string;
};

/**
 * The fields worth reporting a change to. Deliberately not "every column":
 * is_paid has its own actions (paid/unpaid), is_paused has paused/resumed,
 * and logging those twice would read as two separate edits.
 */
const FIELD_LABEL: Record<string, string> = {
  name: "Nombre",
  amount: "Monto",
  due_date: "Vencimiento",
  recurrence: "Frecuencia",
  remind_days_before: "Aviso",
  logo: "Ícono",
  is_automatic: "Débito automático",
  amount_is_variable: "Monto variable",
  notes: "Nota",
  payment_url: "Enlace de pago",
};

/** Postgres hands numerics back as strings, so compare on value, not on shape. */
function comparable(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  const asNumber = Number(value);
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(asNumber)
    ? asNumber
    : (value as string | number);
}

export function diffPayment(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const field of Object.keys(FIELD_LABEL)) {
    if (!(field in after)) continue;
    if (comparable(before[field]) === comparable(after[field])) continue;
    changes[field] = { from: before[field] ?? null, to: after[field] ?? null };
  }
  return changes;
}

export function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "vacío";
  switch (field) {
    case "amount":
      return formatCOP(Number(value));
    case "due_date":
      return formatDueDate(String(value), true);
    case "recurrence":
      return RECURRENCE_LABEL[String(value)] ?? String(value);
    case "remind_days_before": {
      const days = Number(value);
      return days === 0 ? "el mismo día" : `${days} día${days === 1 ? "" : "s"} antes`;
    }
    case "is_automatic":
    case "amount_is_variable":
      return value ? "Sí" : "No";
    default:
      return String(value);
  }
}

export function describeChange(field: string, change: FieldChange): string {
  return `${FIELD_LABEL[field] ?? field}: ${formatFieldValue(field, change.from)} → ${formatFieldValue(field, change.to)}`;
}

const VERB: Record<ActivityAction, string> = {
  created: "agregó el pago",
  updated: "editó el pago",
  paid: "marcó como pagado",
  unpaid: "devolvió a pendiente",
  paused: "pausó el pago",
  resumed: "reanudó el pago",
  deleted: "eliminó el pago",
  rolled_over: "pasó al siguiente ciclo",
  shared: "compartió el pago",
  share_accepted: "aceptó el pago compartido",
  share_rejected: "rechazó el pago compartido",
  share_revoked: "quitó el acceso",
  share_left: "salió del pago compartido",
};

/**
 * One entry as a sentence, minus the actor - the UI puts the name in front
 * so it can bold it. `lines` carries the specifics: which fields changed
 * and how, how much was actually settled, who was let in or out.
 */
export function describeActivity(
  action: ActivityAction,
  details: ActivityDetails | null | undefined
): { verb: string; lines: string[] } {
  const info = details ?? {};
  const lines: string[] = [];

  switch (action) {
    case "updated":
      for (const [field, change] of Object.entries(info.changes ?? {})) {
        lines.push(describeChange(field, change));
      }
      // A rename has its own "from → to" line already; without any tracked
      // field changing there's nothing honest left to say.
      if (lines.length === 0) lines.push("Sin cambios registrados");
      break;
    case "paid":
      if (info.amount != null) lines.push(`Monto: ${formatCOP(info.amount)}`);
      if (info.dueDate) lines.push(`Ciclo del ${formatDueDate(info.dueDate, true)}`);
      break;
    case "unpaid":
      if (info.dueDate) lines.push(`Ciclo del ${formatDueDate(info.dueDate, true)}`);
      break;
    case "rolled_over":
      if (info.nextDueDate) lines.push(`Nueva fecha: ${formatDueDate(info.nextDueDate, true)}`);
      break;
    case "shared":
    case "share_revoked":
      if (info.person) lines.push(info.person);
      break;
    default:
      break;
  }

  const verb =
    action === "shared" && info.person
      ? `compartió el pago con ${info.person}`
      : action === "share_revoked" && info.person
        ? `le quitó el acceso a ${info.person}`
        : VERB[action];

  return { verb, lines: action === "shared" || action === "share_revoked" ? [] : lines };
}
