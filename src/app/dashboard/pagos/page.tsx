import { colombiaToday } from "@/lib/dates";
import { collaboratorsByPayment, filterPaymentsByScope, parseScope } from "@/lib/scope";
import { getCurrentUser, getPayments, getShares } from "@/lib/dashboard-data";
import { AddPaymentButton, PaymentsView } from "@/app/dashboard/payments-view";
import { ScopeFilter } from "@/app/dashboard/scope-filter";
import type { Payment } from "@/app/dashboard/payment-types";
import { Reveal } from "@/app/dashboard/motion";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string | string[]; ambito?: string | string[]; con?: string | string[] }>;
}) {
  const { pago, ambito, con } = await searchParams;
  const scope = parseScope({ ambito, con });

  // Already fetched by the layout - these resolve without a round trip.
  const [user, paymentsData, shares] = await Promise.all([
    getCurrentUser(),
    getPayments(),
    getShares(),
  ]);

  const payments = paymentsData as Payment[];
  const collaborators = collaboratorsByPayment(payments, shares, user?.id ?? "");

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
        payments={filterPaymentsByScope(payments, scope, collaborators)}
        todayStr={colombiaToday()}
        initialDetailId={typeof pago === "string" ? pago : undefined}
      />
    </div>
  );
}
