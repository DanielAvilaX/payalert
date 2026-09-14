import { createClient } from "@/lib/supabase/server";
import { colombiaToday } from "@/lib/dates";
import { collaboratorsByPayment, filterPaymentsByScope, parseScope, type ShareLink } from "@/lib/scope";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: paymentsData }, { data: sharesData }] = await Promise.all([
    supabase.from("payments").select("*").order("due_date", { ascending: true }),
    supabase.from("payment_shares").select("payment_id, shared_with, invited_by, status"),
  ]);

  const payments = (paymentsData ?? []) as Payment[];
  const collaborators = collaboratorsByPayment(
    payments,
    (sharesData ?? []) as ShareLink[],
    user?.id ?? ""
  );

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
