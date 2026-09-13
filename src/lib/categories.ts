export type CategoryId =
  | "vivienda"
  | "servicios"
  | "telecom"
  | "suscripciones"
  | "deudas"
  | "transporte"
  | "salud"
  | "ahorro"
  | "otros";

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  vivienda: "Vivienda",
  servicios: "Servicios públicos",
  telecom: "Internet y celular",
  suscripciones: "Suscripciones",
  deudas: "Tarjetas y créditos",
  transporte: "Transporte",
  salud: "Salud",
  ahorro: "Ahorro y viajes",
  otros: "Otros",
};

// Derived from the logo the user already picks (or that's auto-detected
// from the name) instead of asking for a category: one more required field
// is exactly the friction that makes people stop adding bills. Changing a
// payment's logo is how its category changes.
const LOGO_CATEGORY: Record<string, CategoryId> = {
  netflix: "suscripciones",
  spotify: "suscripciones",
  prime: "suscripciones",
  youtube: "suscripciones",
  google: "suscripciones",
  icloud: "suscripciones",
  xbox: "suscripciones",
  playstation: "suscripciones",
  claro: "telecom",
  movistar: "telecom",
  tigo: "telecom",
  etb: "telecom",
  internet: "telecom",
  bancolombia: "deudas",
  bancodebogota: "deudas",
  davivienda: "deudas",
  scotiabank: "deudas",
  tarjeta: "deudas",
  luz: "servicios",
  agua: "servicios",
  gas: "servicios",
  house: "vivienda",
  building: "vivienda",
  car: "transporte",
  health: "salud",
  savings: "ahorro",
  vacations: "ahorro",
  money: "otros",
};

export function categoryOf(logo: string | null | undefined): CategoryId {
  return LOGO_CATEGORY[logo ?? ""] ?? "otros";
}
