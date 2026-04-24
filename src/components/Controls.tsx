import { useMemo } from "react";
import type { Anlegg, FilterCriteria, Sykdomstype } from "../types";
import { sykFull, sykShort } from "../lib/sykdom";
import { fmtProduksjonsform } from "../lib/format";

interface Props {
  anlegg: Anlegg[];
  criteria: FilterCriteria;
  onChange: (c: FilterCriteria) => void;
}

export function Controls({ anlegg, criteria, onChange }: Props) {
  const sykdomstyper = useMemo(() => {
    const set = new Set<Sykdomstype>();
    for (const a of anlegg) for (const s of a.sykdomstilfeller ?? []) set.add(s.sykdomstype);
    return [...set].sort((a, b) => sykShort(a).localeCompare(sykShort(b), "nb"));
  }, [anlegg]);

  const produksjonsformer = useMemo(() => {
    const set = new Set<string>();
    for (const a of anlegg) for (const p of a.produksjonsform ?? []) set.add(p);
    return [...set].sort((a, b) => a.localeCompare(b, "nb"));
  }, [anlegg]);

  return (
    <div className="controls">
      <div className="search">
        <label htmlFor="q">Søk</label>
        <input
          id="q"
          type="search"
          placeholder="anleggsnavn eller lokalitetsnummer"
          autoComplete="off"
          spellCheck={false}
          value={criteria.query}
          onChange={(e) => onChange({ ...criteria, query: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="sykdom">Sykdomstype</label>
        <select
          id="sykdom"
          value={criteria.sykdomstype}
          onChange={(e) =>
            onChange({ ...criteria, sykdomstype: e.target.value as Sykdomstype | "" })
          }
        >
          <option value="">Alle</option>
          {sykdomstyper.map((t) => (
            <option key={t} value={t}>
              {sykShort(t)} — {sykFull(t)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="prod">Produksjonsform</label>
        <select
          id="prod"
          value={criteria.produksjonsform}
          onChange={(e) => onChange({ ...criteria, produksjonsform: e.target.value })}
        >
          <option value="">Alle</option>
          {produksjonsformer.map((p) => (
            <option key={p} value={p}>
              {fmtProduksjonsform(p)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className={"filter-pill" + (criteria.onlyWithCases ? " active" : "")}
        aria-pressed={criteria.onlyWithCases}
        onClick={() =>
          onChange({ ...criteria, onlyWithCases: !criteria.onlyWithCases })
        }
      >
        <span className="filter-pill-dot" aria-hidden />
        Bare med sykdomstilfeller
      </button>
    </div>
  );
}
