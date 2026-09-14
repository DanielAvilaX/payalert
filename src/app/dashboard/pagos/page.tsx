import { colombiaToday } from "@/lib/dates";
import { getPayments } from "@/lib/dashboard-data";
import { AddPaymentButton, PaymentsView } from "@/app/dashboard/payments-view";
import { ScopeFilter } from "@/app/dashboard/scope-filter";
import type { Payment } from "@/app/dashboard/payment-types";
import { Reveal } from "@/app/dashboard/motion";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string | string[] }>;
}) {
  const { pago } = await searchParams;
  // Already fetched by the layout - this resolves without a round trip.
  // Everything is handed over unfiltered: the scope filter runs in the
  // browser, so switching it costs nothing.
  const payments = (await getPayments()) as Payment[];

  return (
    <div className="space-y-5">
      {/* On phones the header already says "Mis Pagos" and the floating
          button adds a payment, so this row is desktop-only. */}
      <Reveal className="hidden items-end justify-between gap-4 lg:flex">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
          <p className="mt-1 text-sm text-muted">Crea, edita y da seguimiento a tus pagos.</p>
        </div>
        <AddPaymentButton />
      </Reveal>

      <ScopeFilter />

      <PaymentsView
        payments={payments}
        todayStr={colombiaToday()}
        initialDetailId={typeof pago === "string" ? pago : undefined}
      />
    </div>
  );
}
