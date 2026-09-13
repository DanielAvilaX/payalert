"use client";

import { useState } from "react";
import { ChevronRight, Layers } from "lucide-react";
import { CountUp, Reveal } from "@/app/dashboard/motion";
import { BreakdownModal, type BreakdownRow } from "@/app/dashboard/breakdown-modal";
import { SectionHeading } from "@/app/dashboard/section-heading";
import type { CategoryShare } from "@/lib/metrics";

/**
 * "Por categoría", each row a button that opens exactly the payments summed
 * into it - "Ahorro y viajes" is a number until you can see the two or
 * three payments that made it up.
 */
export function CategoryCard({
  categories,
  rowsByCategory,
  topCategory,
}: {
  categories: CategoryShare[];
  rowsByCategory: Record<string, BreakdownRow[]>;
  topCategory: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const active = categories.find((category) => category.category === open);

  return (
    <Reveal delay={100}>
      <section className="card h-full p-5">
        <SectionHeading icon={Layers} title="Por categoría" subtitle="Costo mensual de tus pagos recurrentes" />
        {categories.length ? (
          <ul className="space-y-1">
            {categories.map((category, i) => (
              <li key={category.category}>
                <button
                  type="button"
                  onClick={() => setOpen(category.category)}
                  className="group -mx-1.5 flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium break-words">{category.label}</span>
                      <span className="shrink-0">
                        <CountUp value={category.monthly} delay={i * 60} />
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="bar-grow-x h-full rounded-full bg-accent"
                          style={{
                            width: `${Math.max(2, (category.monthly / topCategory) * 100)}%`,
                            animationDelay: `${350 + i * 80}ms`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-muted">
                        <CountUp value={category.share * 100} format="percent" delay={i * 60} />
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-subtle transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Agrega montos a tus pagos recurrentes para ver en qué se va tu plata.
          </p>
        )}
      </section>

      <BreakdownModal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={active?.label ?? ""}
        subtitle="Pagos recurrentes en esta categoría"
        rows={(open && rowsByCategory[open]) || []}
        emptyText="No hay pagos en esta categoría."
      />
    </Reveal>
  );
}
