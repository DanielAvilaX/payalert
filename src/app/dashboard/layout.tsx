import { redirect } from "next/navigation";
import { colombiaToday, daysUntil } from "@/lib/dates";
import { describeDue } from "@/lib/payment-status";
import {
  getCurrentUser,
  getPayments,
  getProfiles,
  getShares,
  getTelegramConnection,
} from "@/lib/dashboard-data";
import { AppShell, type ShellNotification } from "@/app/dashboard/app-shell";
import { DeleteConfirmProvider } from "@/app/dashboard/delete-confirm-context";
import { RemindersModalProvider } from "@/app/dashboard/reminders-modal-context";
import { ToastProvider } from "@/app/dashboard/toast-context";
import { PaymentUIProvider } from "@/app/dashboard/payment-ui-context";
import { PeopleProvider, type Person } from "@/app/dashboard/sharing-context";

// Bills due within this many days show up in the notification bell.
const BELL_WINDOW_DAYS = 3;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // The proxy normally redirects first, but a session that expires between
  // its check and this render would otherwise crash the whole dashboard on
  // a null dereference instead of just asking the user to sign in again.
  if (!user) redirect("/login");

  // All five are deduplicated with the pages below (see lib/dashboard-data):
  // whichever asks first pays for the round trip, the rest are free.
  const [telegramConnection, payments, profiles, shares] = await Promise.all([
    getTelegramConnection(),
    getPayments(),
    getProfiles(),
    getShares(),
  ]);

  const todayStr = colombiaToday();
  const notifications: ShellNotification[] = payments
    .filter((payment) => !payment.is_paid && !payment.is_paused)
    .map((payment) => ({ payment, days: daysUntil(payment.due_date, todayStr) }))
    .filter(({ days }) => days <= BELL_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)
    .map(({ payment, days }) => ({
      id: payment.id as string,
      name: payment.name as string,
      label: describeDue(payment.due_date as string, todayStr).label,
      tone: days < 0 ? "overdue" : days === 0 ? "today" : "soon",
    }));

  // Read off the shares we already have rather than its own count query -
  // RLS returns every invitation addressed to this account.
  const pendingInvitations = shares.filter(
    (share) => share.shared_with === user.id && share.status === "pending"
  ).length;

  // The profiles policy only ever returns me plus the people I actually
  // share something with, so this *is* the "filtrar por persona" list.
  const people: Person[] = profiles
    .filter((profile) => profile.id !== user.id)
    .map((profile) => ({
      id: profile.id as string,
      name: (profile.full_name as string | null) ?? null,
      email: (profile.email as string | null) ?? null,
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
            <PeopleProvider people={people}>
              <AppShell
                userName={userName}
                userEmail={user.email ?? ""}
                telegramConnected={Boolean(telegramConnection)}
                notifications={notifications}
                pendingInvitations={pendingInvitations}
              >
                {children}
              </AppShell>
            </PeopleProvider>
          </PaymentUIProvider>
        </RemindersModalProvider>
      </DeleteConfirmProvider>
    </ToastProvider>
  );
}
