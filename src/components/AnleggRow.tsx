import type { MouseEvent } from "react";
import type { Anlegg } from "../types";
import { DiseaseBadge } from "./DiseaseBadge";
import { primaryEier } from "../lib/format";

interface Props {
  anlegg: Anlegg;
  selected: boolean;
  checked: boolean;
  onSelect: (id: number) => void;
  onToggleCheck: (id: number, shift: boolean) => void;
}

export function AnleggRow({ anlegg, selected, checked, onSelect, onToggleCheck }: Props) {
  const cases = anlegg.sykdomstilfeller ?? [];
  const hasCases = cases.length > 0;
  const cls = [
    selected ? "selected" : "",
    hasCases ? "has-cases" : "",
    checked ? "checked" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const prodLine = (anlegg.produksjonsform ?? []).join(" · ") || "—";
  const eier = primaryEier(anlegg.eiere);

  const handleCheckClick = (e: MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleCheck(anlegg.anleggId, e.shiftKey);
  };

  return (
    <tr className={cls} onClick={() => onSelect(anlegg.anleggId)}>
      <td className="col-check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Velg ${anlegg.anleggNavn || anlegg.anleggId}`}
          checked={checked}
          onClick={handleCheckClick}
          onChange={() => {
            /* handled in onClick to capture shift */
          }}
        />
      </td>
      <td>
        <div className="navn">{anlegg.anleggNavn || "—"}</div>
        <div className="id">
          ID {anlegg.anleggId} · {prodLine}
        </div>
      </td>
      <td className="meta-txt">
        {eier ? (
          <>
            {eier.name}
            {eier.more > 0 ? <span className="meta-txt"> + {eier.more}</span> : null}
          </>
        ) : (
          <span className="dim">—</span>
        )}
      </td>
      <td className="right">
        {hasCases ? (
          <div className="badges">
            {cases.map((c, i) => (
              <DiseaseBadge key={`${c.sykdomstype}-${i}`} sykdomstype={c.sykdomstype} />
            ))}
          </div>
        ) : (
          <span className="no-cases">—</span>
        )}
      </td>
    </tr>
  );
}
