import { useEffect, useId, useRef, useState } from "react";

interface Props {
  fra: string | null;
  til: string | null;
  onChange: (next: { fra: string | null; til: string | null }) => void;
}

const DAY_NAMES = ["man", "tir", "ons", "tor", "fre", "lør", "søn"];
const MONTH_FMT = new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" });
const DISPLAY_FMT = new Intl.DateTimeFormat("nb-NO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

interface Preset {
  key: string;
  label: string;
  compute: () => { fra: string; til: string };
}

const today0 = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const toIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseIso = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};
const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a: Date | null, b: Date | null): boolean =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const mondayBased = (jsDay: number): number => (jsDay + 6) % 7;

const PRESETS: Preset[] = [
  {
    key: "30d",
    label: "Siste 30 dager",
    compute: () => {
      const t = today0();
      const f = new Date(t);
      f.setDate(f.getDate() - 30);
      return { fra: toIso(f), til: toIso(t) };
    },
  },
  {
    key: "12m",
    label: "Siste 12 mnd",
    compute: () => {
      const t = today0();
      const f = new Date(t);
      f.setDate(f.getDate() - 365);
      return { fra: toIso(f), til: toIso(t) };
    },
  },
  {
    key: "year",
    label: "I år",
    compute: () => {
      const t = today0();
      return { fra: `${t.getFullYear()}-01-01`, til: toIso(t) };
    },
  },
];

function matchPreset(fra: string | null, til: string | null): Preset | null {
  if (!fra || !til) return null;
  for (const p of PRESETS) {
    const r = p.compute();
    if (r.fra === fra && r.til === til) return p;
  }
  return null;
}

function buildMonthCells(viewMonth: Date): Date[] {
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
  return cells;
}

export function DateRangePicker({ fra, til, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const fraDate = parseIso(fra);
  const tilDate = parseIso(til);
  const today = today0();

  /** Click-to-set behaviour:
   *  - If neither set, click sets `fra`.
   *  - If `fra` set but no `til`, click sets `til` (auto-flips if before fra).
   *  - If both set, a fresh click resets and starts a new range from this date.
   */
  const [pickStage, setPickStage] = useState<"start" | "end">(
    fra && !til ? "end" : "start",
  );

  // Two months side-by-side. Left view month defaults to the current selection
  // (or today). Right view month is left + 1.
  const [leftViewMonth, setLeftViewMonth] = useState<Date>(() =>
    startOfMonth(fraDate ?? tilDate ?? today),
  );

  useEffect(() => {
    if (open) {
      setLeftViewMonth(startOfMonth(fraDate ?? tilDate ?? today));
      setPickStage(fra && !til ? "end" : "start");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const rightViewMonth = addMonths(leftViewMonth, 1);

  const inRange = (d: Date): boolean => {
    if (!fraDate || !tilDate) return false;
    const [lo, hi] =
      fraDate.getTime() < tilDate.getTime() ? [fraDate, tilDate] : [tilDate, fraDate];
    return d.getTime() > lo.getTime() && d.getTime() < hi.getTime();
  };

  const handleDayClick = (d: Date) => {
    const iso = toIso(d);
    if (pickStage === "start") {
      onChange({ fra: iso, til: null });
      setPickStage("end");
      return;
    }
    // pickStage === "end"
    if (fraDate && d.getTime() < fraDate.getTime()) {
      onChange({ fra: iso, til: toIso(fraDate) });
    } else {
      onChange({ fra: fra, til: iso });
    }
    setPickStage("start");
    setOpen(false);
  };

  const applyPreset = (p: Preset) => {
    const r = p.compute();
    onChange({ fra: r.fra, til: r.til });
    setOpen(false);
  };

  const clear = () => {
    onChange({ fra: null, til: null });
    setPickStage("start");
  };

  const display = (() => {
    const matched = matchPreset(fra, til);
    if (matched) return matched.label;
    if (fraDate && tilDate) return `${DISPLAY_FMT.format(fraDate)} – ${DISPLAY_FMT.format(tilDate)}`;
    if (fraDate) return `Fra ${DISPLAY_FMT.format(fraDate)}`;
    if (tilDate) return `Til ${DISPLAY_FMT.format(tilDate)}`;
    return "Velg datointervall";
  })();

  const hasValue = !!(fra || til);

  function MonthGrid({ viewMonth }: { viewMonth: Date }) {
    const cells = buildMonthCells(viewMonth);
    return (
      <div className="dpr-grid" role="grid">
        {cells.map((d) => {
          const isCurMonth = d.getMonth() === viewMonth.getMonth();
          const isFra = isSameDay(d, fraDate);
          const isTil = isSameDay(d, tilDate);
          const isToday = isSameDay(d, today);
          const ranged = inRange(d);
          const cls = [
            "dp-cell",
            !isCurMonth && "dp-cell-out",
            (isFra || isTil) && "dp-cell-selected",
            ranged && "dp-cell-in-range",
            isToday && "dp-cell-today",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={d.toISOString()}
              type="button"
              className={cls}
              onClick={() => handleDayClick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="dpr-wrap" ref={wrapRef}>
      <button
        id={id}
        type="button"
        className={"ms-trigger" + (hasValue ? " ms-trigger-active" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="ms-summary">{display}</span>
        <span className="dp-icon" aria-hidden>
          📅
        </span>
      </button>
      {open && (
        <div className="dpr-popover" role="dialog" aria-label="Velg datointervall">
          <aside className="dpr-presets">
            <div className="dpr-presets-label">Hurtigvalg</div>
            <ul>
              {PRESETS.map((p) => {
                const matched = matchPreset(fra, til);
                const active = matched?.key === p.key;
                return (
                  <li key={p.key}>
                    <button
                      type="button"
                      className={"dpr-preset" + (active ? " dpr-preset-active" : "")}
                      onClick={() => applyPreset(p)}
                    >
                      {p.label}
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  className="dpr-preset dpr-preset-clear"
                  onClick={clear}
                  disabled={!hasValue}
                >
                  Tøm
                </button>
              </li>
            </ul>
            <div className="dpr-stage-hint">
              {pickStage === "start" ? "Velg startdato" : "Velg sluttdato"}
            </div>
          </aside>
          <div className="dpr-cal">
            <div className="dpr-months">
              <div className="dpr-month">
                <div className="dpr-month-head">
                  <button
                    type="button"
                    className="dp-nav"
                    onClick={() => setLeftViewMonth((m) => addMonths(m, -1))}
                    aria-label="Forrige måned"
                  >
                    ‹
                  </button>
                  <span className="dpr-month-title">
                    {MONTH_FMT.format(leftViewMonth).replace(/^./, (c) => c.toUpperCase())}
                  </span>
                  <span style={{ width: 32 }} />
                </div>
                <div className="dp-weekdays">
                  {DAY_NAMES.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <MonthGrid viewMonth={leftViewMonth} />
              </div>
              <div className="dpr-month">
                <div className="dpr-month-head">
                  <span style={{ width: 32 }} />
                  <span className="dpr-month-title">
                    {MONTH_FMT.format(rightViewMonth).replace(/^./, (c) => c.toUpperCase())}
                  </span>
                  <button
                    type="button"
                    className="dp-nav"
                    onClick={() => setLeftViewMonth((m) => addMonths(m, 1))}
                    aria-label="Neste måned"
                  >
                    ›
                  </button>
                </div>
                <div className="dp-weekdays">
                  {DAY_NAMES.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <MonthGrid viewMonth={rightViewMonth} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
