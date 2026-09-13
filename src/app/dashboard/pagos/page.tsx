import { createClient } from "@/lib/supabase/server";
import { colombiaToday } from "@/lib/dates";
import { AddPaymentButton, PaymentsView } from "@/app/dashboard/payments-view";
import type { Payment } from "@/app/dashboard/payment-types";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string | string[] }>;
}) {
  const { pago } = await searchParams;
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("due_date", { ascending: true });

  return (
    <div className="space-y-5">
      {/* On phones the header already says "Mis Pagos" and the floating
          button adds a payment, so this row is desktop-only. */}
      <div className="hidden items-end justify-between gap-4 lg:flex">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
          <p className="mt-1 text-sm text-muted">Crea, edita y da seguimiento a tus pagos.</p>
        </div>
        <AddPaymentButton />
      </div>

      <PaymentsView
        payments={(payments ?? []) as Payment[]}
        todayStr={colombiaToday()}
        initialDetailId={typeof pago === "string" ? pago : undefined}
      />
    </div>
  );
}
