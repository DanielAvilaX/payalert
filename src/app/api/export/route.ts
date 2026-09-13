import { createClient } from "@/lib/supabase/server";
import { colombiaToday } from "@/lib/dates";
import { toCSV } from "@/lib/csv";
import { isOnTime } from "@/lib/metrics";
import { RECURRENCE_LABEL } from "@/app/dashboard/payment-types";

/**
 * Your data, in a file you can open in Excel or Sheets.
 * ?tipo=historial (default) - every payment you've marked as paid.
 * ?tipo=pagos               - your current bills and their state.
 *
 * Goes through the proxy like any dashboard route, so an anonymous request
 * is redirected to /login before it gets here; queries are scoped to the
 * user on top of RLS.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const kind = new URL(request.url).searchParams.get("tipo") === "pagos" ? "pagos" : "historial";
  let csv: string;

  if (kind === "pagos") {
    const { data, error } = await supabase
      .from("payments")
      .select("name, amount, recurrence, due_date, is_paid, is_paused, is_automatic, notes")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });
    if (error) return new Response("No se pudo exportar", { status: 500 });

    csv = toCSV([
      ["Pago", "Monto", "Frecuencia", "Próximo vencimiento", "Estado", "Débito automático", "Nota"],
      ...(data ?? []).map((payment) => [
        payment.name,
        payment.amount != null ? Math.round(Number(payment.amount)) : null,
        RECURRENCE_LABEL[payment.recurrence] ?? payment.recurrence,
        payment.due_date,
        payment.is_paused ? "Pausado" : payment.is_paid ? "Pagado" : "Pendiente",
        payment.is_automatic ? "Sí" : "No",
        payment.notes,
      ]),
    ]);
  } else {
    const { data, error } = await supabase
      .from("payment_events")
      .select("name, amount, due_date, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });
    if (error) return new Response("No se pudo exportar", { status: 500 });

    csv = toCSV([
      ["Fecha de pago", "Pago", "Monto", "Vencía el", "A tiempo"],
      ...(data ?? []).map((event) => [
        colombiaToday(new Date(event.completed_at)),
        event.name,
        event.amount != null ? Math.round(Number(event.amount)) : null,
        event.due_date,
        isOnTime(event) ? "Sí" : "No",
      ]),
    ]);
  }

  // The BOM makes Excel read the file as UTF-8, so "Débito" and "Sí" survive.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payalert-${kind}-${colombiaToday()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
