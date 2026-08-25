import {
  Lightbulb,
  Droplet,
  Flame,
  Wifi,
  Tv,
  CreditCard,
  Phone,
  Home,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type CategoryId =
  | "luz"
  | "agua"
  | "gas"
  | "internet"
  | "streaming"
  | "tarjeta"
  | "telefono"
  | "arriendo"
  | "otro";

type CategoryConfig = {
  label: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
};

export const CATEGORIES: Record<CategoryId, CategoryConfig> = {
  luz: { label: "Luz", icon: Lightbulb, bg: "bg-yellow-500/15", fg: "text-yellow-400" },
  agua: { label: "Agua", icon: Droplet, bg: "bg-sky-500/15", fg: "text-sky-400" },
  gas: { label: "Gas", icon: Flame, bg: "bg-orange-500/15", fg: "text-orange-400" },
  internet: { label: "Internet", icon: Wifi, bg: "bg-purple-500/15", fg: "text-purple-400" },
  streaming: { label: "Streaming", icon: Tv, bg: "bg-rose-500/15", fg: "text-rose-400" },
  tarjeta: { label: "Tarjeta / crédito", icon: CreditCard, bg: "bg-violet-500/15", fg: "text-violet-400" },
  telefono: { label: "Teléfono", icon: Phone, bg: "bg-cyan-500/15", fg: "text-cyan-400" },
  arriendo: { label: "Arriendo", icon: Home, bg: "bg-emerald-500/15", fg: "text-emerald-400" },
  otro: { label: "Otro", icon: Wallet, bg: "bg-neutral-500/15", fg: "text-neutral-400" },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as [CategoryId, CategoryConfig][];

export function categoryConfig(id: string | null | undefined): CategoryConfig {
  return CATEGORIES[(id as CategoryId) ?? "otro"] ?? CATEGORIES.otro;
}
