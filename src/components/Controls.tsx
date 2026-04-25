import { useEffect, useMemo, useState } from "react";
import type { Anlegg, CaseStatus, FilterCriteria, SortKey, Sykdomstype } from "../types";
import { sykFull, sykShort } from "../lib/sykdom";
import { fmtProduksjonsform } from "../lib/format";
import { countAdvancedFilters, SORT_LABELS } from "../lib/filter";
import { STATUS_LABELS } from "../lib/cases";
import { artLabel } from "../lib/arter";
import { MultiSelect } from "./MultiSelect";
import { SingleSelect } from "./SingleSelect";
import { DatePicker } from "./DatePicker";

const SORT_KEYS: SortKey[] = ["cases-desc", "name-asc", "name-desc", "date-desc", "id-asc"];
const SORT_OPTIONS = SORT_KEYS.map((k) => ({ value: k, label: SORT_LABELS[k] }));
const STATUS_OPTIONS: Array<{ value: CaseStatus; label: string }> = [
  { value: "aktiv", label: STATUS_LABELS.aktiv },
  { value: "avsluttet", label: STATUS_LABELS.avsluttet },
  { value: "ugyldig", label: STATUS_LABELS.ugyldig },
];

interface Props {
  anlegg: Anlegg[];
  criteria: FilterCriteria;
  onChange: (c: FilterCriteria) => void;
  resultCount: number;
  selectedCount: number;
  onExportFiltered: () => void;
}

const ADVANCED_OPEN_KEY = "fish.advancedFiltersOpen";

export function Controls({
  anlegg,
  criteria,
  onChange,
  resultCount,
  selectedCount,
  onExportFiltered,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADVANCED_OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(ADVANCED_OPEN_KEY, advancedOpen ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [advancedOpen]);

  const sykdomstyper = useMemo(() => {
    const set = new Set<Sykdomstype>();
    for (const a of anlegg) for (const s of a.sykdomstilfeller ?? []) set.add(s.sykdomstype);
    return [...set]
      .sort((a, b) => sykShort(a).localeCompare(sykShort(b), "nb"))
      .map((t) => ({ value: t, label: `${sykShort(t)} — ${sykFull(t)}` }));
  }, [anlegg]);

  const produksjonsformer = useMemo(() => {
    const set = new Set<string>();
    for (const a of anlegg) for (const p of a.produksjonsform ?? []) set.add(p);
    return [...set]
      .sort((a, b) => a.localeCompare(b, "nb"))
      .map((p) => ({ value: p, label: fmtProduksjonsform(p) }));
  }, [anlegg]);

  const arter = useMemo(() => {
    const set = new Set<string>();
    for (const a of anlegg) for (const x of a.arter ?? []) set.add(x);
    return [...set]
      .map((x) => ({ value: x, label: artLabel(x) }))
      .sort((a, b) => a.label.localeCompare(b.label, "nb"));
  }, [anlegg]);

  const advancedCount = countAdvancedFilters(criteria);

  const setPreset = (days: number | "year") => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const til = today.toISOString().slice(0, 10);
    let fra: string;
    if (days === "year") {
      fra = `${today.getFullYear()}-01-01`;
    } else {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      fra = d.toISOString().slice(0, 10);
    }
    onChange({ ...criteria, diagnoseDatoFra: fra, diagnoseDatoTil: til });
  };

  const exportLabel =
    selectedCount > 0
      ? `Eksporter alle filtrerte (${resultCount})`
      : `Eksporter (${resultCount})`;

  return (
    <>
      <div className="controls">
        <div className="search">
          <label htmlFor="q">Søk</label>
          <input
            id="q"
            type="search"
            placeholder="navn, eier, orgnr eller anleggs-ID"
            autoComplete="off"
            spellCheck={false}
            value={criteria.query}
            onChange={(e) => onChange({ ...criteria, query: e.target.value })}
          />
        </div>
        <MultiSelect
          label="Sykdomstype"
          options={sykdomstyper}
          selected={criteria.sykdomstyper}
          onChange={(next) =>
            onChange({ ...criteria, sykdomstyper: next as Sykdomstype[] })
          }
        />
        <MultiSelect
          label="Produksjonsform"
          options={produksjonsformer}
          selected={criteria.produksjonsformer}
          onChange={(next) => onChange({ ...criteria, produksjonsformer: next })}
        />
        <button
          type="button"
          className={"filter-pill" + (criteria.onlyWithCases ? " active" : "")}
          aria-pressed={criteria.onlyWithCases}
          onClick={() => onChange({ ...criteria, onlyWithCases: !criteria.onlyWithCases })}
        >
          <span className="filter-pill-dot" aria-hidden />
          Bare med tilfeller
        </button>
        <button
          type="button"
          className={
            "filter-pill ctrl-advanced" + (advancedOpen ? " active" : "")
          }
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          Avanserte filtre{advancedCount > 0 ? ` (${advancedCount})` : ""}
          <span className="filter-pill-caret" aria-hidden>
            {advancedOpen ? "▴" : "▾"}
          </span>
        </button>
        <button
          type="button"
          className="filter-pill ctrl-export"
          onClick={onExportFiltered}
          disabled={resultCount === 0}
          title={resultCount === 0 ? "Ingen rader å eksportere" : undefined}
        >
          {exportLabel}
        </button>
      </div>
      {advancedOpen && (
        <div
          className={
            "controls-advanced" +
            (arter.length === 0 ? " controls-advanced-no-arter" : "")
          }
        >
          <SingleSelect
            label="Sortering"
            options={SORT_OPTIONS}
            value={criteria.sortBy}
            onChange={(v) => onChange({ ...criteria, sortBy: v as SortKey })}
          />
          <MultiSelect
            label="Status"
            options={STATUS_OPTIONS}
            selected={criteria.caseStatuses}
            onChange={(next) =>
              onChange({ ...criteria, caseStatuses: next as CaseStatus[] })
            }
          />
          {arter.length > 0 && (
            <MultiSelect
              label="Arter"
              options={arter}
              selected={criteria.arter}
              onChange={(next) => onChange({ ...criteria, arter: next })}
            />
          )}
          <div className="date-range">
            <label>Diagnosedato</label>
            <div className="date-range-row">
              <div className="date-range-inputs">
                <DatePicker
                  value={criteria.diagnoseDatoFra}
                  onChange={(v) => onChange({ ...criteria, diagnoseDatoFra: v })}
                  pairValue={criteria.diagnoseDatoTil}
                  max={criteria.diagnoseDatoTil ?? undefined}
                  placeholder="Fra dato"
                  ariaLabel="Fra dato"
                />
                <span className="date-range-arrow">→</span>
                <DatePicker
                  value={criteria.diagnoseDatoTil}
                  onChange={(v) => onChange({ ...criteria, diagnoseDatoTil: v })}
                  pairValue={criteria.diagnoseDatoFra}
                  min={criteria.diagnoseDatoFra ?? undefined}
                  placeholder="Til dato"
                  ariaLabel="Til dato"
                />
              </div>
              <div className="date-presets">
                <button type="button" className="preset" onClick={() => setPreset(30)}>
                  30 dager
                </button>
                <button type="button" className="preset" onClick={() => setPreset(365)}>
                  12 mnd
                </button>
                <button type="button" className="preset" onClick={() => setPreset("year")}>
                  I år
                </button>
                <button
                  type="button"
                  className="preset preset-clear"
                  onClick={() =>
                    onChange({ ...criteria, diagnoseDatoFra: null, diagnoseDatoTil: null })
                  }
                  disabled={!criteria.diagnoseDatoFra && !criteria.diagnoseDatoTil}
                >
                  Tøm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
