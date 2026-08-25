import { type LucideIcon } from "lucide-react";

export type LogoId =
  | "netflix"
  | "spotify"
  | "prime"
  | "youtube"
  | "google"
  | "icloud"
  | "xbox"
  | "playstation"
  | "claro"
  | "movistar"
  | "tigo"
  | "etb"
  | "bancolombia"
  | "bancodebogota"
  | "davivienda"
  | "scotiabank"
  | "luz"
  | "agua"
  | "gas"
  | "internet"
  | "house"
  | "car"
  | "health"
  | "tarjeta"
  | "building"
  | "money";

type LogoConfig = {
  label: string;
  // Logos are images in public/logos; `icon` is a plain-icon fallback for
  // any id that doesn't have artwork yet.
  src?: string;
  icon?: LucideIcon;
  keywords: string[];
};

export const LOGOS: Record<LogoId, LogoConfig> = {
  netflix: { label: "Netflix", src: "/logos/Netflix.png", keywords: ["netflix"] },
  spotify: { label: "Spotify", src: "/logos/Spotify.png", keywords: ["spotify"] },
  prime: { label: "Prime Video", src: "/logos/Prime.png", keywords: ["prime", "amazon"] },
  youtube: { label: "YouTube", src: "/logos/Youtube.png", keywords: ["youtube"] },
  google: { label: "Google", src: "/logos/Google.png", keywords: ["google", "gmail"] },
  icloud: { label: "iCloud", src: "/logos/icloud.png", keywords: ["icloud", "apple"] },
  xbox: { label: "Xbox", src: "/logos/Xbox.png", keywords: ["xbox", "game pass"] },
  playstation: {
    label: "PlayStation",
    src: "/logos/Playstation.png",
    keywords: ["playstation", "ps plus", "ps4", "ps5", "sony"],
  },
  claro: { label: "Claro", src: "/logos/Claro.png", keywords: ["claro"] },
  movistar: { label: "Movistar", src: "/logos/Movistar.png", keywords: ["movistar"] },
  tigo: { label: "Tigo", src: "/logos/Tigo.png", keywords: ["tigo", "une"] },
  etb: { label: "ETB", src: "/logos/Etb.png", keywords: ["etb"] },
  bancolombia: { label: "Bancolombia", src: "/logos/Bancolombia.png", keywords: ["bancolombia"] },
  bancodebogota: {
    label: "Banco de Bogotá",
    src: "/logos/Bancodebogota.png",
    keywords: ["banco de bogota", "bogota"],
  },
  davivienda: { label: "Davivienda", src: "/logos/Davivienda.png", keywords: ["davivienda"] },
  scotiabank: {
    label: "Scotiabank",
    src: "/logos/Scotiabank.png",
    keywords: ["scotiabank", "colpatria"],
  },
  luz: {
    label: "Luz",
    src: "/logos/Luz.png",
    keywords: ["luz", "energia", "codensa", "enel", "epm", "electricidad"],
  },
  agua: { label: "Agua", src: "/logos/Agua.png", keywords: ["agua", "acueducto"] },
  gas: { label: "Gas", src: "/logos/Gas.png", keywords: ["gas", "vanti"] },
  internet: {
    label: "Internet",
    src: "/logos/internet.png",
    keywords: ["internet", "wifi", "banda ancha"],
  },
  house: {
    label: "Arriendo / Vivienda",
    src: "/logos/House.png",
    keywords: ["arriendo", "renta", "vivienda", "apartamento"],
  },
  car: { label: "Vehículo", src: "/logos/Car.png", keywords: ["carro", "vehiculo", "moto", "soat"] },
  health: {
    label: "Salud",
    src: "/logos/Health.png",
    keywords: ["salud", "eps", "medicina", "sura", "compensar"],
  },
  tarjeta: {
    label: "Tarjeta de crédito",
    src: "/logos/Tarjet.png",
    keywords: ["tarjeta", "credito", "visa", "mastercard"],
  },
  building: {
    label: "Administración",
    src: "/logos/Building.png",
    keywords: ["administracion", "edificio", "conjunto", "cuota admin"],
  },
  money: { label: "Otro", src: "/logos/Money.png", keywords: [] },
};

export const LOGO_OPTIONS = Object.entries(LOGOS) as [LogoId, LogoConfig][];

export function logoConfig(id: string | null | undefined): LogoConfig {
  return LOGOS[(id as LogoId) ?? "money"] ?? LOGOS.money;
}

const ACCENTED = "áéíóúüñ";
const PLAIN = "aeiouun";

function normalize(text: string): string {
  let result = text.toLowerCase();
  for (let i = 0; i < ACCENTED.length; i++) {
    result = result.split(ACCENTED[i]).join(PLAIN[i]);
  }
  return result;
}

export function detectLogo(name: string): LogoId {
  const normalized = normalize(name);
  if (!normalized.trim()) return "money";

  for (const [id, cfg] of LOGO_OPTIONS) {
    if (cfg.keywords.some((kw) => normalized.includes(kw))) {
      return id;
    }
  }
  return "money";
}
