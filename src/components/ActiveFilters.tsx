import { EMPTY_CRITERIA, type FilterCriteria } from "../types";
import { sykShort } from "../lib/sykdom";
import { fmtProduksjonsform } from "../lib/format";
import { isFilterActive, SORT_LABELS } from "../lib/filter";
import { STATUS_LABELS } from "../lib/cases";
import { artLabel } from "../lib/arter";

interface Props {
  criteria: FilterCriteria;
  onChange: (c: FilterCriteria) => void;
  resultCount: number;
  totalCount: number;
}

export function ActiveFilters({ criteria, onChange, resultCount, totalCount }: Props) {
  if (!isFilterActive(criteria)) return null;

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (criteria.query) {
    chips.push({
      key: "q",
      label: `Søk: ${criteria.query}`,
      onRemove: () => onChange({ ...criteria, query: "" }),
    });
  }
  for (const t of criteria.sykdomstyper) {
    chips.push({
      key: `syk:${t}`,
      label: `Sykdom: ${sykShort(t)}`,
      onRemove: () =>
        onChange({ ...criteria, sykdomstyper: criteria.sykdomstyper.filter((x) => x !== t) }),
    });
  }
  for (const p of criteria.produksjonsformer) {
    chips.push({
      key: `prod:${p}`,
      label: `Produksjon: ${fmtProduksjonsform(p)}`,
      onRemove: () =>
        onChange({
          ...criteria,
          produksjonsformer: criteria.produksjonsformer.filter((x) => x !== p),
        }),
    });
  }
  for (const a of criteria.arter) {
    chips.push({
      key: `art:${a}`,
      label: `Art: ${artLabel(a)}`,
      onRemove: () => onChange({ ...criteria, arter: criteria.arter.filter((x) => x !== a) }),
    });
  }
  for (const st of criteria.caseStatuses) {
    chips.push({
      key: `status:${st}`,
      label: `Status: ${STATUS_LABELS[st]}`,
      onRemove: () =>
        onChange({
          ...criteria,
          caseStatuses: criteria.caseStatuses.filter((x) => x !== st),
        }),
    });
  }
  if (criteria.onlyWithCases) {
    chips.push({
      key: "cases",
      label: "Bare med sykdomstilfeller",
      onRemove: () => onChange({ ...criteria, onlyWithCases: false }),
    });
  }
  if (criteria.sortBy !== "cases-desc") {
    chips.push({
      key: "sort",
      label: `Sortert: ${SORT_LABELS[criteria.sortBy]}`,
      onRemove: () => onChange({ ...criteria, sortBy: "cases-desc" }),
    });
  }
  if (criteria.diagnoseDatoFra || criteria.diagnoseDatoTil) {
    const from = criteria.diagnoseDatoFra ?? "…";
    const to = criteria.diagnoseDatoTil ?? "…";
    chips.push({
      key: "dato",
      label: `Diagnose: ${from} → ${to}`,
      onRemove: () =>
        onChange({ ...criteria, diagnoseDatoFra: null, diagnoseDatoTil: null }),
    });
  }

  return (
    <div className="active-filters" role="region" aria-label="Aktive filtre">
      <span className="active-filters-count">
        {resultCount} av {totalCount} treff
      </span>
      <div className="chips">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className="chip"
            onClick={c.onRemove}
            aria-label={`Fjern filter: ${c.label}`}
          >
            <span>{c.label}</span>
            <span className="chip-x" aria-hidden>
              ✕
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="active-filters-clear"
        onClick={() => onChange(EMPTY_CRITERIA)}
      >
        Tøm alle
      </button>
    </div>
  );
}
