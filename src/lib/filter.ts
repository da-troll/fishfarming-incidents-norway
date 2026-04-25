import type { Anlegg, FilterCriteria, SortKey } from "../types";

function latestDiagnoseTs(a: Anlegg): number {
  let max = -Infinity;
  for (const s of a.sykdomstilfeller ?? []) {
    const ds = s.diagnosedato ?? s.varslingsdato;
    const t = Date.parse(ds);
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max;
}

export function filterAnlegg(anlegg: Anlegg[], c: FilterCriteria): Anlegg[] {
  const qRaw = c.query.trim().toLowerCase();
  const asNum = /^\d+$/.test(qRaw) ? Number(qRaw) : null;

  const fraTs = c.diagnoseDatoFra ? Date.parse(c.diagnoseDatoFra) : null;
  // Til is inclusive of the whole day — bump to end of day.
  const tilTs = c.diagnoseDatoTil ? Date.parse(c.diagnoseDatoTil) + 86_400_000 - 1 : null;

  return anlegg.filter((a) => {
    if (c.onlyWithCases && !(a.sykdomstilfeller?.length ?? 0)) return false;

    const cases = a.sykdomstilfeller ?? [];

    if (c.caseStatuses.length) {
      if (!cases.some((s) => c.caseStatuses.includes(s.status))) return false;
    }

    if (c.sykdomstyper.length) {
      if (!cases.some((s) => c.sykdomstyper.includes(s.sykdomstype))) return false;
    }

    if (c.produksjonsformer.length) {
      const set = a.produksjonsform ?? [];
      if (!c.produksjonsformer.some((p) => set.includes(p))) return false;
    }

    if (c.arter.length) {
      const set = a.arter ?? [];
      if (!c.arter.some((x) => set.includes(x))) return false;
    }

    if (fraTs !== null || tilTs !== null) {
      // Range applies to disease cases. If sykdomstype + status filters are
      // active, restrict the date check to compatible cases. Use diagnosedato
      // when available, fall back to varslingsdato (cases reported but not yet
      // diagnosed).
      let eligible = cases;
      if (c.sykdomstyper.length) {
        eligible = eligible.filter((s) => c.sykdomstyper.includes(s.sykdomstype));
      }
      if (c.caseStatuses.length) {
        eligible = eligible.filter((s) => c.caseStatuses.includes(s.status));
      }
      const matched = eligible.some((s) => {
        const ds = s.diagnosedato ?? s.varslingsdato;
        const ts = Date.parse(ds);
        if (Number.isNaN(ts)) return false;
        if (fraTs !== null && ts < fraTs) return false;
        if (tilTs !== null && ts > tilTs) return false;
        return true;
      });
      if (!matched) return false;
    }

    if (qRaw) {
      if (asNum !== null) {
        if (a.anleggId !== asNum && !String(a.anleggId).includes(qRaw)) return false;
      } else {
        const navn = (a.anleggNavn ?? "").toLowerCase();
        const eiere = (a.eiere ?? [])
          .map((e) => `${e.navn ?? ""} ${e.id ?? ""}`.toLowerCase())
          .join(" ");
        if (!navn.includes(qRaw) && !eiere.includes(qRaw)) return false;
      }
    }
    return true;
  });
}

const nameAsc = (a: Anlegg, b: Anlegg) =>
  (a.anleggNavn ?? "").localeCompare(b.anleggNavn ?? "", "nb");

export function sortAnlegg(list: Anlegg[], by: SortKey = "cases-desc"): Anlegg[] {
  const cmp: Record<SortKey, (a: Anlegg, b: Anlegg) => number> = {
    "cases-desc": (a, b) => {
      const diff = (b.sykdomstilfeller?.length ?? 0) - (a.sykdomstilfeller?.length ?? 0);
      return diff !== 0 ? diff : nameAsc(a, b);
    },
    "name-asc": nameAsc,
    "name-desc": (a, b) => -nameAsc(a, b),
    "date-desc": (a, b) => {
      // Anlegg with cases first, sorted by latest diagnose desc;
      // then anlegg without cases sorted by name.
      const ta = latestDiagnoseTs(a);
      const tb = latestDiagnoseTs(b);
      if (ta === tb) return nameAsc(a, b);
      if (ta === -Infinity) return 1;
      if (tb === -Infinity) return -1;
      return tb - ta;
    },
    "id-asc": (a, b) => a.anleggId - b.anleggId,
  };
  return [...list].sort(cmp[by]);
}

export const SORT_LABELS: Record<SortKey, string> = {
  "cases-desc": "Flest tilfeller først",
  "name-asc": "Navn A→Å",
  "name-desc": "Navn Å→A",
  "date-desc": "Siste diagnose først",
  "id-asc": "Anleggs-ID stigende",
};

export function isFilterActive(c: FilterCriteria): boolean {
  // onlyWithCases is intentionally excluded — its toggle in the main toolbar
  // already communicates active state; surfacing it as a chip is redundant.
  return Boolean(
    c.query ||
      c.sykdomstyper.length ||
      c.produksjonsformer.length ||
      c.arter.length ||
      c.caseStatuses.length ||
      c.diagnoseDatoFra ||
      c.diagnoseDatoTil ||
      c.sortBy !== "cases-desc",
  );
}

export function countAdvancedFilters(c: FilterCriteria): number {
  let n = 0;
  if (c.arter.length) n++;
  if (c.diagnoseDatoFra || c.diagnoseDatoTil) n++;
  if (c.sortBy !== "cases-desc") n++;
  return n;
}
