import { useEffect, useId, useRef, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ label, options, selected, onChange, placeholder = "Alle" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} valgt`;

  return (
    <div className="ms-wrap" ref={wrapRef}>
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className={"ms-trigger" + (selected.length ? " ms-trigger-active" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ms-summary">{summary}</span>
        <span className="ms-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="ms-popover" role="listbox" aria-multiselectable="true">
          <div className="ms-actions">
            <button
              type="button"
              className="ms-mini"
              onClick={() => onChange(options.map((o) => o.value))}
              disabled={selected.length === options.length}
            >
              Velg alle
            </button>
            <button
              type="button"
              className="ms-mini"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
            >
              Tøm
            </button>
          </div>
          <ul className="ms-list">
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <label className="ms-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.value)}
                    />
                    <span>{o.label}</span>
                  </label>
                </li>
              );
            })}
            {options.length === 0 && <li className="ms-empty">Ingen verdier</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
