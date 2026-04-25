import type { Sykdomstype } from "../types";

export const SYKDOM_LABELS: Record<Sykdomstype, { short: string; full: string }> = {
  INFEKSIOES_HEMATOPOIETISK_NEKROSE: { short: "IHN", full: "Infeksiøs hematopoietisk nekrose" },
  INFEKSIOES_LAKSEANEMI: { short: "ILA", full: "Infeksiøs lakseanemi" },
  VIRAL_HEMORAGISK_SEPTIKEMI: { short: "VHS", full: "Viral hemoragisk septikemi" },
  VIRAL_NERVOES_NEKROSE: { short: "VNN", full: "Viral nervøs nekrose" },
  FURUNKULOSE: { short: "FUR", full: "Furunkulose" },
  PANKREASSYKDOM: { short: "PD", full: "Pankreassykdom" },
  FRANCISELLOSE: { short: "FRA", full: "Francisellose" },
  BAKTERIELL_NYRESYKE: { short: "BKD", full: "Bakteriell nyresyke" },
  SYSTEMISK_INFEKSJON_MED_FLAVOBACTERIUM_PSYCHROPHILUM: {
    short: "FLAV",
    full: "Systemisk infeksjon m/ Flavobacterium psychrophilum",
  },
  INFEKSJON_GYRODACTYLUS_SALARIS: { short: "GYRO", full: "Infeksjon med Gyrodactylus salaris" },
  PISCIRICKETTSIOSE: { short: "PRS", full: "Piscirickettsiose" },
  NY_SMITTSOM_SYKDOM_I_NORGE: { short: "NY", full: "Ny smittsom sykdom i Norge" },
};

/** Reports endpoint uses Norwegian Ø; anlegg endpoint uses anglicized OES.
 * Normalize to the OES form internally. */
export function normalizeSykdomstype(s: string): string {
  return s
    .replace(/INFEKSIØS/g, "INFEKSIOES")
    .replace(/NERVØS/g, "NERVOES");
}

export const sykShort = (t: string) =>
  (SYKDOM_LABELS as Record<string, { short: string }>)[t]?.short ?? t.slice(0, 4);

export const sykFull = (t: string) =>
  (SYKDOM_LABELS as Record<string, { full: string }>)[t]?.full ?? t;
