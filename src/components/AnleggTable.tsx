import type { Anlegg, LoadStatus } from "../types";
import { AnleggRow } from "./AnleggRow";
import { fmtNumber } from "../lib/format";
import { Spinner } from "./Spinner";

const MAX_RENDER = 400;

interface Props {
  anlegg: Anlegg[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  status: LoadStatus;
}

export function AnleggTable({ anlegg, selectedId, onSelect, status }: Props) {
  if (!anlegg.length) {
    return (
      <div className="table-wrap">
        <table>
          <colgroup>
            <col className="col-anlegg" />
            <col className="col-eier" />
            <col className="col-syk" />
          </colgroup>
          <thead>
            <tr>
              <th>Anlegg</th>
              <th>Eier</th>
              <th className="right">Sykdomstilfeller</th>
            </tr>
          </thead>
          <tbody />
        </table>
        {status === "loading" || status === "idle" ? (
          <div className="loading-center">
            <Spinner size={22} />
            <div>Laster anlegg …</div>
          </div>
        ) : (
          <div className="empty">Ingen treff.</div>
        )}
      </div>
    );
  }

  const slice = anlegg.slice(0, MAX_RENDER);
  const truncated = anlegg.length > MAX_RENDER;

  return (
    <div className="table-wrap">
      <table>
        <colgroup>
          <col className="col-anlegg" />
          <col className="col-eier" />
          <col className="col-syk" />
        </colgroup>
        <thead>
          <tr>
            <th>Anlegg</th>
            <th>Eier</th>
            <th className="right">Sykdomstilfeller</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((a) => (
            <AnleggRow
              key={a.anleggId}
              anlegg={a}
              selected={a.anleggId === selectedId}
              onSelect={onSelect}
            />
          ))}
          {truncated && (
            <tr>
              <td colSpan={3} className="truncated-note">
                Viser {MAX_RENDER} av {fmtNumber(anlegg.length)} treff — forfin søket
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
