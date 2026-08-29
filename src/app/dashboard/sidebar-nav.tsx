"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard/pagos", label: "Tus pagos", icon: Wallet },
  { href: "/dashboard/resumen", label: "Resumen", icon: BarChart3 },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition active:scale-95 ${
              active
                ? "bg-accent/10 font-medium text-accent"
                : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
