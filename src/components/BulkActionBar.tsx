interface Props {
  count: number;
  onExport: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, onExport, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div className="bulk-bar" role="status" aria-live="polite">
      <span className="bulk-count">
        <strong>{count}</strong> {count === 1 ? "anlegg" : "anlegg"} valgt
      </span>
      <div className="bulk-actions">
        <button type="button" className="filter-pill active" onClick={onExport}>
          Eksporter valgte ({count})
        </button>
        <button type="button" className="bulk-clear" onClick={onClear}>
          Tøm valg
        </button>
      </div>
    </div>
  );
}
