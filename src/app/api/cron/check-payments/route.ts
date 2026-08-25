import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

type Payment = {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  currency: string;
  due_date: string;
  remind_days_before: number;
};

type NotificationKind = "upcoming" | "due" | "overdue";

function daysUntil(dueDate: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  const [year, month, day] = dueDate.split("-").map(Number);
  const dueUtc = Date.UTC(year, month - 1, day);

  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

function messageFor(kind: NotificationKind, payment: Payment): string {
  const amountText =
    payment.amount != null ? ` (${payment.amount} ${payment.currency})` : "";

  switch (kind) {
    case "upcoming":
      return `⏰ <b>${payment.name}</b>${amountText} vence el ${payment.due_date}.`;
    case "due":
      return `📅 <b>${payment.name}</b>${amountText} vence hoy.`;
    case "overdue":
      return `⚠️ <b>${payment.name}</b>${amountText} venció el ${payment.due_date} y sigue sin marcarse como pagado.`;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, user_id, name, amount, currency, due_date, remind_days_before")
    .eq("is_paid", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const payment of (payments ?? []) as Payment[]) {
    const remaining = daysUntil(payment.due_date);

    const kinds: NotificationKind[] = [];
    if (remaining === payment.remind_days_before) kinds.push("upcoming");
    if (remaining === 0) kinds.push("due");
    if (remaining === -1) kinds.push("overdue");

    for (const kind of kinds) {
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("payment_id", payment.id)
        .eq("kind", kind)
        .eq("due_date", payment.due_date)
        .maybeSingle();
      if (existing) continue;

      const { data: connection } = await supabase
        .from("telegram_connections")
        .select("chat_id")
        .eq("user_id", payment.user_id)
        .maybeSingle();
      if (!connection) continue;

      await sendTelegramMessage(connection.chat_id, messageFor(kind, payment));

      await supabase.from("notification_log").insert({
        payment_id: payment.id,
        user_id: payment.user_id,
        kind,
        due_date: payment.due_date,
      });

      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, checked: payments?.length ?? 0, sent });
}
