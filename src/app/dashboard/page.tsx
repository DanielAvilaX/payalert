import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { createPayment, deletePayment, markPaid } from "@/app/dashboard/actions";
import { TelegramConnect } from "@/app/dashboard/telegram-connect";

const RECURRENCE_LABEL: Record<string, string> = {
  none: "Único",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

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
        <form action={createPayment} className="grid grid-cols-2 gap-3">
          <input
            name="name"
            placeholder="Nombre (ej. Netflix)"
            required
            className="col-span-2 rounded border px-3 py-2"
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="Monto"
            className="rounded border px-3 py-2"
          />
          <input
            name="currency"
            defaultValue="USD"
            placeholder="Moneda"
            className="rounded border px-3 py-2"
          />
          <input
            name="due_date"
            type="date"
            required
            className="rounded border px-3 py-2"
          />
          <select name="recurrence" className="rounded border px-3 py-2">
            <option value="none">Único</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            Avisar
            <input
              name="remind_days_before"
              type="number"
              min={0}
              defaultValue={3}
              className="w-16 rounded border px-2 py-1"
            />
            días antes
          </label>
          <button
            type="submit"
            className="col-span-2 rounded bg-black px-4 py-2 text-white"
          >
            Agregar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Tus pagos</h2>
        {payments?.length ? (
          <ul className="flex flex-col gap-2">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div>
                  <p className="font-medium">
                    {payment.name}{" "}
                    {payment.is_paid && (
                      <span className="text-xs text-green-700">(pagado)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    {payment.due_date} · {RECURRENCE_LABEL[payment.recurrence]}
                    {payment.amount != null &&
                      ` · ${payment.amount} ${payment.currency}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!payment.is_paid && (
                    <form action={markPaid}>
                      <input type="hidden" name="id" value={payment.id} />
                      <button type="submit" className="text-sm underline">
                        Marcar pagado
                      </button>
                    </form>
                  )}
                  <form action={deletePayment}>
                    <input type="hidden" name="id" value={payment.id} />
                    <button
                      type="submit"
                      className="text-sm text-red-600 underline"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">Todavía no tienes pagos.</p>
        )}
      </section>
    </div>
  );
}
