import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAnleggLoader } from "./hooks/useAnleggLoader";
import { Masthead } from "./components/Masthead";
import { Controls } from "./components/Controls";
import { ActiveFilters } from "./components/ActiveFilters";
import { BulkActionBar } from "./components/BulkActionBar";
import { AnleggTable } from "./components/AnleggTable";
import { DetailPanel } from "./components/DetailPanel";
import { Footer } from "./components/Footer";
import { filterAnlegg, isFilterActive, sortAnlegg } from "./lib/filter";
import { anleggToCsv, csvFilename, downloadCsv } from "./lib/csv";
import { criteriaFromUrl, criteriaToUrl } from "./lib/urlState";
import { EMPTY_CRITERIA, type FilterCriteria } from "./types";

export default function App() {
  const { anlegg, status, expectedTotal, error, finishedAt } = useAnleggLoader();

  // Initialize from URL on first render so deep-links work.
  const [criteria, setCriteria] = useState<FilterCriteria>(() =>
    criteriaFromUrl(window.location.search),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const lastClickedRef = useRef<number | null>(null);

  // Sync filter state to URL (push without history spam — replaceState).
  useEffect(() => {
    const url = window.location.pathname + criteriaToUrl(criteria);
    if (url !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", url);
    }
  }, [criteria]);

  // Clear bulk selection whenever filters change (MVP simplicity).
  useEffect(() => {
    setSelectedIds(new Set());
    lastClickedRef.current = null;
  }, [criteria]);

  const filtered = useMemo(
    () => sortAnlegg(filterAnlegg(anlegg, criteria), criteria.sortBy),
    [anlegg, criteria],
  );
  const selected = useMemo(
    () => anlegg.find((a) => a.anleggId === selectedId) ?? null,
    [anlegg, selectedId],
  );
  const withCases = useMemo(
    () => anlegg.reduce((n, a) => n + ((a.sykdomstilfeller?.length ?? 0) > 0 ? 1 : 0), 0),
    [anlegg],
  );

  const handleSelect = (id: number) => setSelectedId((prev) => (prev === id ? null : id));

  const handleToggleCheck = useCallback(
    (id: number, shift: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const last = lastClickedRef.current;
        if (shift && last !== null && last !== id) {
          // Range-select within the currently filtered + visible slice.
          const ids = filtered.map((a) => a.anleggId);
          const i = ids.indexOf(id);
          const j = ids.indexOf(last);
          if (i !== -1 && j !== -1) {
            const [from, to] = i < j ? [i, j] : [j, i];
            const shouldSelect = !prev.has(id);
            for (let k = from; k <= to; k++) {
              if (shouldSelect) next.add(ids[k]);
              else next.delete(ids[k]);
            }
            lastClickedRef.current = id;
            return next;
          }
        }
        if (next.has(id)) next.delete(id);
        else next.add(id);
        lastClickedRef.current = id;
        return next;
      });
    },
    [filtered],
  );

  const handleToggleAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const visibleIds = filtered.slice(0, 400).map((a) => a.anleggId);
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }, [filtered]);

  const handleClearSelection = () => setSelectedIds(new Set());

  const handleExportFiltered = () => {
    if (filtered.length === 0) return;
    const csv = anleggToCsv(filtered);
    downloadCsv(csvFilename(filtered.length), csv);
  };

  const handleExportSelected = () => {
    const rows = anlegg.filter((a) => selectedIds.has(a.anleggId));
    if (rows.length === 0) return;
    const csv = anleggToCsv(rows);
    downloadCsv(csvFilename(rows.length), csv);
  };

  const hasActiveFilters = isFilterActive(criteria);

  return (
    <>
      <Masthead
        total={anlegg.length}
        withCases={withCases}
        expectedTotal={expectedTotal}
        status={status}
        finishedAt={finishedAt}
        error={error}
      />
      <Controls
        anlegg={anlegg}
        criteria={criteria}
        onChange={setCriteria}
        resultCount={filtered.length}
        selectedCount={selectedIds.size}
        onExportFiltered={handleExportFiltered}
      />
      <ActiveFilters
        criteria={criteria}
        onChange={setCriteria}
        resultCount={filtered.length}
        totalCount={anlegg.length}
      />
      <BulkActionBar
        count={selectedIds.size}
        onExport={handleExportSelected}
        onClear={handleClearSelection}
      />
      <div className="layout">
        <AnleggTable
          anlegg={filtered}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onToggleCheck={handleToggleCheck}
          onToggleAllVisible={handleToggleAllVisible}
          status={status}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => setCriteria(EMPTY_CRITERIA)}
        />
        <DetailPanel anlegg={selected} onClose={() => setSelectedId(null)} />
      </div>
      <Footer />
    </>
  );
}
