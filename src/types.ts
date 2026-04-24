export type Sykdomstype =
  | "INFEKSIOES_HEMATOPOIETISK_NEKROSE"
  | "INFEKSIOES_LAKSEANEMI"
  | "VIRAL_HEMORAGISK_SEPTIKEMI"
  | "FURUNKULOSE"
  | "PANKREASSYKDOM"
  | "FRANCISELLOSE"
  | "BAKTERIELL_NYRESYKE"
  | "SYSTEMISK_INFEKSJON_MED_FLAVOBACTERIUM_PSYCHROPHILUM"
  | "INFEKSJON_GYRODACTYLUS_SALARIS";

export interface Eier {
  id: string;
  navn: string;
}

export interface SykdomstilfelleSummary {
  sykdomstype: Sykdomstype;
  diagnoseDato: string;
}

export interface Anlegg {
  anleggId: number;
  anleggNavn: string;
  produksjonsform: string[];
  eiere: Eier[];
  arter: string[];
  sykdomstilfeller: SykdomstilfelleSummary[];
}

export type LoadStatus = "idle" | "loading" | "done" | "error";

export interface FilterCriteria {
  query: string;
  sykdomstype: Sykdomstype | "";
  produksjonsform: string | "";
  onlyWithCases: boolean;
}
