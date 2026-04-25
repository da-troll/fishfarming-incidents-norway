export type Sykdomstype =
  | "INFEKSIOES_HEMATOPOIETISK_NEKROSE"
  | "INFEKSIOES_LAKSEANEMI"
  | "VIRAL_HEMORAGISK_SEPTIKEMI"
  | "VIRAL_NERVOES_NEKROSE"
  | "FURUNKULOSE"
  | "PANKREASSYKDOM"
  | "FRANCISELLOSE"
  | "BAKTERIELL_NYRESYKE"
  | "SYSTEMISK_INFEKSJON_MED_FLAVOBACTERIUM_PSYCHROPHILUM"
  | "INFEKSJON_GYRODACTYLUS_SALARIS"
  | "PISCIRICKETTSIOSE"
  | "NY_SMITTSOM_SYKDOM_I_NORGE";

export type Sykdomssubtype = "PD_SAV2" | "PD_SAV3";

export type Avslutningsårsak =
  | "AVSLUTTET_TØMT_UTEN_MISTANKE_KVALITETSSIKRET"
  | "AVSLUTTET_MISTANKE_AVKREFTET"
  | "AVSLUTTET_ANLEGG_TØMT_OG_FULLFØRT_BRAKKLEGGING";

export type CaseStatus = "aktiv" | "avsluttet" | "ugyldig";

export interface Eier {
  id: string;
  navn: string;
}

export interface Sykdomstilfelle {
  id: string;
  sykdomstype: Sykdomstype;
  sykdomssubtype: Sykdomssubtype | null;
  arter: string[];
  varslingsdato: string;
  oppdrettersMistankedato: string | null;
  kvalitetssikretMistankedato: string | null;
  diagnosedato: string | null;
  avslutningsdato: string | null;
  avslutningsårsak: Avslutningsårsak | null;
  ugyldiggjøringsdato: string | null;
  status: CaseStatus;
  opprettet: string;
  oppdatert: string;
}

export interface Anlegg {
  anleggId: number;
  anleggNavn: string;
  produksjonsform: string[];
  eiere: Eier[];
  arter: string[];
  sykdomstilfeller: Sykdomstilfelle[];
}

export type LoadStatus = "idle" | "loading" | "done" | "error";

export type SortKey =
  | "cases-desc"
  | "name-asc"
  | "name-desc"
  | "date-desc"
  | "id-asc";

export interface FilterCriteria {
  query: string;
  sykdomstyper: Sykdomstype[];
  produksjonsformer: string[];
  arter: string[];
  caseStatuses: CaseStatus[];
  onlyWithCases: boolean;
  diagnoseDatoFra: string | null;
  diagnoseDatoTil: string | null;
  sortBy: SortKey;
}

export const EMPTY_CRITERIA: FilterCriteria = {
  query: "",
  sykdomstyper: [],
  produksjonsformer: [],
  arter: [],
  caseStatuses: [],
  onlyWithCases: false,
  diagnoseDatoFra: null,
  diagnoseDatoTil: null,
  sortBy: "cases-desc",
};
