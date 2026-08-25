import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { TelegramConnect } from "@/app/dashboard/telegram-connect";
import { PaymentForm } from "@/app/dashboard/payment-form";
import { PaymentRow } from "@/app/dashboard/payment-row";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: payments }, { data: telegramConnection }] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .order("due_date", { ascending: true }),
    supabase
      .from("telegram_connections")
      .select("user_id")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">PayAlert</h1>
        <form action={logout}>
          <button type="submit" className="text-sm underline">
            Cerrar sesión
          </button>
        </form>
      </div>

      <TelegramConnect connected={!!telegramConnection} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Nuevo pago</h2>
        <PaymentForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Tus pagos</h2>
        {payments?.length ? (
          <ul className="flex flex-col gap-2">
            {payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">Todavía no tienes pagos.</p>
        )}
      </section>
    </div>
  );
}
