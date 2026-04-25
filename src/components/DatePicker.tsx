import { useEffect, useId, useRef, useState } from "react";

interface Props {
  /** ISO YYYY-MM-DD string or null */
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  /** Other end of a range — days between value and pairValue render as in-range. */
  pairValue?: string | null;
  /** Min selectable date (ISO YYYY-MM-DD). */
  min?: string;
  /** Max selectable date (ISO YYYY-MM-DD). */
  max?: string;
  ariaLabel?: string;
}

const DAY_NAMES = ["man", "tir", "ons", "tor", "fre", "lør", "søn"];
const MONTH_FMT = new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" });
const DISPLAY_FMT = new Intl.DateTimeFormat("nb-NO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 0=Sun..6=Sat → 0=Mon..6=Sun. */
function mondayBased(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Velg dato",
  pairValue,
  min,
  max,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const valueDate = parseIso(value);
  const pairDate = parseIso(pairValue ?? null);
  const minDate = parseIso(min ?? null);
  const maxDate = parseIso(max ?? null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(valueDate ?? pairDate ?? today),
  );

  // Keep view month in sync with value when it changes externally.
  useEffect(() => {
    if (valueDate) setViewMonth(startOfMonth(valueDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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

  // Build the day grid: 6 rows × 7 cols, including leading/trailing days from
  // adjacent months so the layout is always stable.
  const monthStart = startOfMonth(viewMonth);
  const leading = mondayBased(monthStart.getDay());
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - leading);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const inRange = (d: Date): boolean => {
    if (!valueDate || !pairDate) return false;
    const [lo, hi] = valueDate.getTime() < pairDate.getTime() ? [valueDate, pairDate] : [pairDate, valueDate];
    return d.getTime() > lo.getTime() && d.getTime() < hi.getTime();
  };

  const isDisabled = (d: Date): boolean => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const display = valueDate ? DISPLAY_FMT.format(valueDate) : placeholder;

  return (
    <div className="dp-wrap" ref={wrapRef}>
      <button
        id={id}
        type="button"
        className={"dp-trigger" + (valueDate ? " dp-trigger-active" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="dp-display">{display}</span>
        <span className="dp-icon" aria-hidden>
          📅
        </span>
      </button>
      {open && (
        <div className="dp-popover" role="dialog" aria-label="Velg dato">
          <div className="dp-header">
            <button
              type="button"
              className="dp-nav"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              aria-label="Forrige måned"
            >
              ‹
            </button>
            <span className="dp-title">
              {MONTH_FMT.format(viewMonth).replace(/^./, (c) => c.toUpperCase())}
            </span>
            <button
              type="button"
              className="dp-nav"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Neste måned"
            >
              ›
            </button>
          </div>
          <div className="dp-weekdays" role="row">
            {DAY_NAMES.map((d) => (
              <span key={d} role="columnheader">
                {d}
              </span>
            ))}
          </div>
          <div className="dp-grid" role="grid">
            {cells.map((d) => {
              const isCurMonth = d.getMonth() === viewMonth.getMonth();
              const isSelected = isSameDay(d, valueDate);
              const isPair = isSameDay(d, pairDate);
              const isToday = isSameDay(d, today);
              const isInRange = inRange(d);
              const disabled = isDisabled(d);
              const cls = [
                "dp-cell",
                !isCurMonth && "dp-cell-out",
                isSelected && "dp-cell-selected",
                isPair && "dp-cell-pair",
                isToday && "dp-cell-today",
                isInRange && "dp-cell-in-range",
                disabled && "dp-cell-disabled",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  className={cls}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(toIso(d));
                    setOpen(false);
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="dp-footer">
            <button
              type="button"
              className="dp-foot-btn"
              onClick={() => {
                onChange(toIso(today));
                setOpen(false);
              }}
            >
              I dag
            </button>
            <button
              type="button"
              className="dp-foot-btn dp-foot-btn-ghost"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              disabled={!valueDate}
            >
              Tøm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
