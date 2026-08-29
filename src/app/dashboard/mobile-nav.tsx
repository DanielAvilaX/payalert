"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard/pagos", label: "Pagos", icon: Wallet },
  { href: "/dashboard/resumen", label: "Resumen", icon: BarChart3 },
  { href: "/dashboard/configuracion", label: "Ajustes", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  // prefetch={false} - see sidebar-nav.tsx: these routes are fully dynamic,
  // so the default prefetch just fired an extra hanging server render.
  return (
    <nav className="glass-panel fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around px-2 py-2 md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs transition active:scale-95 ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            <Icon size={24} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
