import { PlusCircle, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "@/app/dashboard/payment-form";
import { PaymentsList } from "@/app/dashboard/payments-list";

export default async function PagosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("due_date", { ascending: true });

  const defaultDays = (user?.user_metadata?.default_remind_days_before as number | undefined) ?? 3;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Tus pagos</h1>
        <p className="text-sm text-muted">
          Crea, edita y da seguimiento a tus recordatorios de pago.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-panel animate-pop-in h-fit rounded-2xl p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <PlusCircle size={18} />
            </span>
            Información del pago
          </h2>
          <PaymentForm defaultRemindDaysBefore={defaultDays} />
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Wallet size={18} />
            </span>
            Tus pagos
          </h2>
          <PaymentsList payments={payments ?? []} />
        </section>
      </div>
    </div>
  );
}
