import { useEffect, useId, useRef, useState } from "react";
import type { MultiSelectOption } from "./MultiSelect";

interface Props {
  label: string;
  options: MultiSelectOption[];
  value: string;
  onChange: (next: string) => void;
}

export function SingleSelect({ label, options, value, onChange }: Props) {
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

  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="ms-wrap" ref={wrapRef}>
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className="ms-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ms-summary">{current}</span>
        <span className="ms-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="ms-popover" role="listbox">
          <ul className="ms-list">
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    className={"ms-item ms-item-single" + (selected ? " ms-item-current" : "")}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={"ms-radio" + (selected ? " ms-radio-checked" : "")}
                      aria-hidden
                    />
                    <span>{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
