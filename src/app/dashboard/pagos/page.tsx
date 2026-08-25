import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "@/app/dashboard/payment-form";
import { PaymentsList } from "@/app/dashboard/payments-list";

export default async function PagosPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("due_date", { ascending: true });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Tus pagos</h1>
        <p className="text-sm text-muted">
          Crea, edita y da seguimiento a tus recordatorios de pago.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-panel animate-pop-in h-fit rounded-xl p-5">
          <h2 className="mb-4 text-lg font-medium">Información del pago</h2>
          <PaymentForm />
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          <PaymentsList payments={payments ?? []} />
        </section>
      </div>
    </div>
  );
}
