import Image from "next/image";
import { Zap } from "lucide-react";
import { logoConfig } from "@/lib/logos";
import { formatCOP } from "@/lib/format";
import type { PaymentStatus } from "@/lib/payment-status";
import type { Payment } from "@/app/dashboard/payment-types";

export function LogoBadge({
  logo,
  automatic = false,
  size = 40,
}: {
  logo: string | null;
  automatic?: boolean;
  size?: number;
}) {
  const cfg = logoConfig(logo);
  const Icon = cfg.icon;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {Icon ? (
        <div
          title={cfg.label}
          className="flex h-full w-full items-center justify-center rounded-full bg-surface-2 text-foreground"
        >
          <Icon size={Math.round(size * 0.5)} />
        </div>
      ) : (
        <Image
          src={cfg.src!}
          alt=""
          width={size}
          height={size}
          title={cfg.label}
          className="h-full w-full rounded-full object-cover"
        />
      )}
      {automatic && (
        <span
          title="Pago automático"
          className="absolute -right-0.5 -bottom-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-surface"
        >
          <Zap size={10} fill="currentColor" />
        </span>
      )}
    </div>
  );
}

/** The state pill. Always carries its label - colour is never the only cue. */
export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.badgeClass}`}
    >
      {status.label}
    </span>
  );
}

/** "~$164.000" for a variable bill: the stored figure is last month's reality. */
export function formatPaymentAmount(payment: Pick<Payment, "amount" | "amount_is_variable">) {
  if (payment.amount == null) return "—";
  return `${payment.amount_is_variable ? "~" : ""}${formatCOP(payment.amount)}`;
}
