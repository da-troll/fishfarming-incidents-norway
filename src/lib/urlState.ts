import {
  EMPTY_CRITERIA,
  type CaseStatus,
  type FilterCriteria,
  type SortKey,
  type Sykdomstype,
} from "../types";

const VALID_SORTS: SortKey[] = ["cases-desc", "name-asc", "name-desc", "date-desc", "id-asc"];
const VALID_STATUSES: CaseStatus[] = ["aktiv", "avsluttet", "ugyldig"];

export function criteriaToUrl(c: FilterCriteria): string {
  const p = new URLSearchParams();
  if (c.query) p.set("q", c.query);
  if (c.sykdomstyper.length) p.set("syk", c.sykdomstyper.join(","));
  if (c.produksjonsformer.length) p.set("prod", c.produksjonsformer.join(","));
  if (c.arter.length) p.set("arter", c.arter.join(","));
  if (c.caseStatuses.length) p.set("status", c.caseStatuses.join(","));
  if (c.onlyWithCases) p.set("cases", "1");
  if (c.diagnoseDatoFra) p.set("fra", c.diagnoseDatoFra);
  if (c.diagnoseDatoTil) p.set("til", c.diagnoseDatoTil);
  if (c.sortBy && c.sortBy !== "cases-desc") p.set("sort", c.sortBy);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function criteriaFromUrl(search: string): FilterCriteria {
  const p = new URLSearchParams(search);
  const list = (k: string) => (p.get(k) ?? "").split(",").filter(Boolean);
  const sortRaw = p.get("sort") as SortKey | null;
  const sortBy = sortRaw && VALID_SORTS.includes(sortRaw) ? sortRaw : EMPTY_CRITERIA.sortBy;
  return {
    ...EMPTY_CRITERIA,
    query: p.get("q") ?? "",
    sykdomstyper: list("syk") as Sykdomstype[],
    produksjonsformer: list("prod"),
    arter: list("arter"),
    caseStatuses: list("status").filter((s): s is CaseStatus =>
      VALID_STATUSES.includes(s as CaseStatus),
    ),
    onlyWithCases: p.get("cases") === "1",
    diagnoseDatoFra: p.get("fra") || null,
    diagnoseDatoTil: p.get("til") || null,
    sortBy,
  };
}
