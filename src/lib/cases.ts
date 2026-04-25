import type { CaseStatus, Sykdomstilfelle } from "../types";
import { normalizeSykdomstype } from "./sykdom";

interface RawReport {
  id: string;
  opprettet: string;
  oppdatert: string;
  lokalitetsnummer?: number;
  lokalitetsnavn: string;
  varslingsdato: string;
  oppdrettersMistankedato: string | null;
  kvalitetssikretMistankedato: string | null;
  diagnosedato: string | null;
  avslutningsdato: string | null;
  avslutningsårsak: string | null;
  ugyldiggjøringsdato: string | null;
  sykdomstype: string;
  sykdomssubtype: string | null;
  arter: Array<{ artskode: string }>;
}

export function deriveStatus(
  c: Pick<Sykdomstilfelle, "avslutningsdato" | "ugyldiggjøringsdato">,
): CaseStatus {
  if (c.ugyldiggjøringsdato) return "ugyldig";
  if (c.avslutningsdato) return "avsluttet";
  return "aktiv";
}

export function mapReportToCase(r: RawReport): Sykdomstilfelle {
  const base = {
    id: r.id,
    sykdomstype: normalizeSykdomstype(r.sykdomstype) as Sykdomstilfelle["sykdomstype"],
    sykdomssubtype: (r.sykdomssubtype as Sykdomstilfelle["sykdomssubtype"]) ?? null,
    arter: (r.arter ?? []).map((a) => a.artskode),
    varslingsdato: r.varslingsdato,
    oppdrettersMistankedato: r.oppdrettersMistankedato,
    kvalitetssikretMistankedato: r.kvalitetssikretMistankedato,
    diagnosedato: r.diagnosedato,
    avslutningsdato: r.avslutningsdato,
    avslutningsårsak: (r.avslutningsårsak as Sykdomstilfelle["avslutningsårsak"]) ?? null,
    ugyldiggjøringsdato: r.ugyldiggjøringsdato,
    opprettet: r.opprettet,
    oppdatert: r.oppdatert,
  };
  return { ...base, status: deriveStatus(base) };
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  aktiv: "Aktiv",
  avsluttet: "Avsluttet",
  ugyldig: "Ugyldiggjort",
};

const ÅRSAK_LABELS: Record<string, string> = {
  AVSLUTTET_TØMT_UTEN_MISTANKE_KVALITETSSIKRET: "Tømt uten mistanke (kvalitetssikret)",
  AVSLUTTET_MISTANKE_AVKREFTET: "Mistanke avkreftet",
  AVSLUTTET_ANLEGG_TØMT_OG_FULLFØRT_BRAKKLEGGING: "Anlegg tømt og brakklagt",
};

export const årsakLabel = (a: string | null) =>
  a ? ÅRSAK_LABELS[a] ?? a : "";
