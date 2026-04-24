import type { Anlegg } from "../types";
import { DiseaseBadge } from "./DiseaseBadge";
import { primaryEier } from "../lib/format";

interface Props {
  anlegg: Anlegg;
  selected: boolean;
  onSelect: (id: number) => void;
}

export function AnleggRow({ anlegg, selected, onSelect }: Props) {
  const cases = anlegg.sykdomstilfeller ?? [];
  const hasCases = cases.length > 0;
  const cls = [selected ? "selected" : "", hasCases ? "has-cases" : ""].filter(Boolean).join(" ");
  const prodLine = (anlegg.produksjonsform ?? []).join(" · ") || "—";
  const eier = primaryEier(anlegg.eiere);

  return (
    <tr className={cls} onClick={() => onSelect(anlegg.anleggId)}>
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
