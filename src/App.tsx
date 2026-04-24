import { useMemo, useState } from "react";
import { useAnleggLoader } from "./hooks/useAnleggLoader";
import { Masthead } from "./components/Masthead";
import { Controls } from "./components/Controls";
import { AnleggTable } from "./components/AnleggTable";
import { DetailPanel } from "./components/DetailPanel";
import { Footer } from "./components/Footer";
import { filterAnlegg } from "./lib/filter";
import type { FilterCriteria } from "./types";

export default function App() {
  const { anlegg, status, expectedTotal, error, finishedAt } = useAnleggLoader();
  const [criteria, setCriteria] = useState<FilterCriteria>({
    query: "",
    sykdomstype: "",
    produksjonsform: "",
    onlyWithCases: false,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(() => filterAnlegg(anlegg, criteria), [anlegg, criteria]);
  const selected = useMemo(
    () => anlegg.find((a) => a.anleggId === selectedId) ?? null,
    [anlegg, selectedId],
  );
  const withCases = useMemo(
    () => anlegg.reduce((n, a) => n + ((a.sykdomstilfeller?.length ?? 0) > 0 ? 1 : 0), 0),
    [anlegg],
  );

  const handleSelect = (id: number) => setSelectedId((prev) => (prev === id ? null : id));

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
      <Controls anlegg={anlegg} criteria={criteria} onChange={setCriteria} />
      <div className="layout">
        <AnleggTable
          anlegg={filtered}
          selectedId={selectedId}
          onSelect={handleSelect}
          status={status}
        />
        <DetailPanel anlegg={selected} onClose={() => setSelectedId(null)} />
      </div>
      <Footer />
    </>
  );
}
