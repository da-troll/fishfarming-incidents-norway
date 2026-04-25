import type { ChangeEvent } from "react";
import { useEffect, useRef } from "react";
import type { Anlegg, LoadStatus } from "../types";
import { AnleggRow } from "./AnleggRow";
import { fmtNumber } from "../lib/format";
import { Spinner } from "./Spinner";

const MAX_RENDER = 400;

interface Props {
  anlegg: Anlegg[];
  selectedId: number | null;
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggleCheck: (id: number, shift: boolean) => void;
  onToggleAllVisible: () => void;
  status: LoadStatus;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function HeaderCheckbox({
  visibleCount,
  selectedVisibleCount,
  onToggle,
}: {
  visibleCount: number;
  selectedVisibleCount: number;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const allChecked = visibleCount > 0 && selectedVisibleCount === visibleCount;
  const someChecked = selectedVisibleCount > 0 && !allChecked;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someChecked;
  }, [someChecked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Velg alle synlige"
      checked={allChecked}
      onChange={(_e: ChangeEvent<HTMLInputElement>) => onToggle()}
    />
  );
}

export function AnleggTable({
  anlegg,
  selectedId,
  selectedIds,
  onSelect,
  onToggleCheck,
  onToggleAllVisible,
  status,
  hasActiveFilters,
  onClearFilters,
}: Props) {
  if (!anlegg.length) {
    return (
      <div className="table-wrap">
        <table>
          <colgroup>
            <col className="col-check-c" />
            <col className="col-anlegg" />
            <col className="col-eier" />
            <col className="col-syk" />
          </colgroup>
          <thead>
            <tr>
              <th className="col-check" />
              <th>Anlegg <span className="th-count">(0)</span></th>
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
        ) : hasActiveFilters ? (
          <div className="empty">
            Ingen treff for disse filtrene.
            <div>
              <button type="button" className="empty-clear" onClick={onClearFilters}>
                Tøm alle filtre
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">Ingen treff.</div>
        )}
      </div>
    );
  }

  const slice = anlegg.slice(0, MAX_RENDER);
  const truncated = anlegg.length > MAX_RENDER;
  const visibleCount = slice.length;
  const selectedVisibleCount = slice.reduce(
    (n, a) => n + (selectedIds.has(a.anleggId) ? 1 : 0),
    0,
  );

  return (
    <div className="table-wrap">
      <table>
        <colgroup>
          <col className="col-check-c" />
          <col className="col-anlegg" />
          <col className="col-eier" />
          <col className="col-syk" />
        </colgroup>
        <thead>
          <tr>
            <th className="col-check">
              <HeaderCheckbox
                visibleCount={visibleCount}
                selectedVisibleCount={selectedVisibleCount}
                onToggle={onToggleAllVisible}
              />
            </th>
            <th>
              Anlegg <span className="th-count">({fmtNumber(anlegg.length)})</span>
            </th>
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
              checked={selectedIds.has(a.anleggId)}
              onSelect={onSelect}
              onToggleCheck={onToggleCheck}
            />
          ))}
          {truncated && (
            <tr>
              <td colSpan={4} className="truncated-note">
                Viser {MAX_RENDER} av {fmtNumber(anlegg.length)} treff — forfin søket
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
