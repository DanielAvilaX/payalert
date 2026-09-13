import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { colombiaToday, daysUntil } from "@/lib/dates";
import { describeDue } from "@/lib/payment-status";
import { AppShell, type ShellNotification } from "@/app/dashboard/app-shell";
import { DeleteConfirmProvider } from "@/app/dashboard/delete-confirm-context";
import { RemindersModalProvider } from "@/app/dashboard/reminders-modal-context";
import { ToastProvider } from "@/app/dashboard/toast-context";
import { PaymentUIProvider } from "@/app/dashboard/payment-ui-context";

// Bills due within this many days show up in the notification bell.
const BELL_WINDOW_DAYS = 3;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The proxy normally redirects first, but a session that expires between
  // its check and this render would otherwise crash the whole dashboard on
  // a null dereference instead of just asking the user to sign in again.
  if (!user) redirect("/login");

  const [{ data: telegramConnection }, { data: openPayments }] = await Promise.all([
    supabase.from("telegram_connections").select("user_id").eq("user_id", user.id).maybeSingle(),
    // Only what the bell needs. The layout isn't re-rendered on client-side
    // navigation, but every mutation revalidates it, so the badge stays true.
    supabase
      .from("payments")
      .select("id, name, due_date")
      .eq("user_id", user.id)
      .eq("is_paid", false)
      .eq("is_paused", false),
  ]);

  const todayStr = colombiaToday();
  const notifications: ShellNotification[] = (openPayments ?? [])
    .map((payment) => ({ payment, days: daysUntil(payment.due_date, todayStr) }))
    .filter(({ days }) => days <= BELL_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)
    .map(({ payment, days }) => ({
      id: payment.id,
      name: payment.name,
      label: describeDue(payment.due_date, todayStr).label,
      tone: days < 0 ? "overdue" : days === 0 ? "today" : "soon",
    }));

  const fullName = (user.user_metadata?.full_name as string | undefined)?.trim();
  const userName = fullName || user.email?.split("@")[0] || "Tu cuenta";
  const defaultRemindDaysBefore =
    (user.user_metadata?.default_remind_days_before as number | undefined) ?? 3;

  return (
    <ToastProvider>
      <DeleteConfirmProvider>
        <RemindersModalProvider>
          <PaymentUIProvider defaultRemindDaysBefore={defaultRemindDaysBefore}>
            <AppShell
              userName={userName}
              userEmail={user.email ?? ""}
              telegramConnected={Boolean(telegramConnection)}
              notifications={notifications}
            >
              {children}
            </AppShell>
          </PaymentUIProvider>
        </RemindersModalProvider>
      </DeleteConfirmProvider>
    </ToastProvider>
  );
}
