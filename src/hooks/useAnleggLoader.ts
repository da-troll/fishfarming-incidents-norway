import { useEffect, useState } from "react";
import {
  fetchAllReports,
  fetchAnleggPage,
  FIRST_PAGE_SIZE,
  PARALLEL_CONCURRENCY,
  pageSizeForIndex,
  type AnleggBase,
} from "../lib/api";
import { sortAnlegg } from "../lib/filter";
import { mapReportToCase } from "../lib/cases";
import type { Anlegg, LoadStatus, Sykdomstilfelle } from "../types";

export interface LoaderState {
  anlegg: Anlegg[];
  status: LoadStatus;
  loadedCount: number;
  expectedTotal: number | null;
  error: string | null;
  finishedAt: Date | null;
}

interface SingletonState extends LoaderState {
  started: boolean;
  subs: Set<() => void>;
}

const singleton: SingletonState = {
  anlegg: [],
  status: "idle",
  loadedCount: 0,
  expectedTotal: null,
  error: null,
  finishedAt: null,
  started: false,
  subs: new Set(),
};

function emit() {
  for (const fn of singleton.subs) fn();
}

/** De-dupe report revisions: keep the most-recently `oppdatert` row for each
 * (lokalitetsnummer, sykdomstype, varslingsdato) tuple. */
function dedupeReports(cases: Sykdomstilfelle[]): Sykdomstilfelle[] {
  const map = new Map<string, Sykdomstilfelle>();
  for (const c of cases) {
    const key = `${c.sykdomstype}|${c.varslingsdato}`;
    const prev = map.get(key);
    if (!prev || c.oppdatert > prev.oppdatert) map.set(key, c);
  }
  return [...map.values()];
}

function joinAnlegg(
  base: AnleggBase[],
  casesByLok: Map<number, Sykdomstilfelle[]>,
): Anlegg[] {
  return base.map((a) => {
    const raw = casesByLok.get(a.anleggId) ?? [];
    const cases = dedupeReports(raw).sort((x, y) =>
      (y.diagnosedato ?? y.varslingsdato).localeCompare(x.diagnosedato ?? x.varslingsdato),
    );
    const arter = [...new Set(cases.flatMap((c) => c.arter))].sort();
    return { ...a, sykdomstilfeller: cases, arter };
  });
}

async function loadReports(): Promise<Map<number, Sykdomstilfelle[]>> {
  const reports = await fetchAllReports();
  const map = new Map<number, Sykdomstilfelle[]>();
  for (const r of reports) {
    if (!r.lokalitetsnummer) continue;
    const c = mapReportToCase(r);
    const arr = map.get(r.lokalitetsnummer) ?? [];
    arr.push(c);
    map.set(r.lokalitetsnummer, arr);
  }
  return map;
}

async function startLoad() {
  if (singleton.started) return;
  singleton.started = true;
  singleton.status = "loading";
  emit();

  const baseAccum: AnleggBase[] = [];
  // Reports usually finish well before anlegg streams complete; until they do,
  // joins use an empty map (anlegg show up with no cases).
  let casesByLok: Map<number, Sykdomstilfelle[]> = new Map();

  const reportsPromise = loadReports()
    .then((map) => {
      casesByLok = map;
      // Re-emit any anlegg already accumulated, now joined.
      singleton.anlegg = sortAnlegg(joinAnlegg(baseAccum, casesByLok));
      emit();
    })
    .catch((err) => {
      // Reports failure shouldn't block anlegg display — log and proceed empty.
      console.warn("[fish] rapporteringer fetch failed:", err);
    });

  const publish = () => {
    singleton.anlegg = sortAnlegg(joinAnlegg(baseAccum, casesByLok));
    singleton.loadedCount = baseAccum.length;
    emit();
  };

  try {
    const first = await fetchAnleggPage(0, FIRST_PAGE_SIZE);
    baseAccum.push(...first.items);
    singleton.expectedTotal = first.total;
    publish();

    const total = first.total;

    if (total != null && total > baseAccum.length) {
      const pages: Array<{ offset: number; limit: number }> = [];
      let offset = FIRST_PAGE_SIZE;
      let i = 0;
      while (offset < total) {
        const limit = Math.min(pageSizeForIndex(i), total - offset);
        pages.push({ offset, limit });
        offset += limit;
        i++;
      }

      let next = 0;
      async function worker() {
        while (true) {
          const j = next++;
          if (j >= pages.length) return;
          const { offset, limit } = pages[j];
          const page = await fetchAnleggPage(offset, limit);
          baseAccum.push(...page.items);
          publish();
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(PARALLEL_CONCURRENCY, pages.length) }, () => worker()),
      );
    } else if (total == null) {
      let offset = FIRST_PAGE_SIZE;
      let i = 0;
      for (;;) {
        const limit = pageSizeForIndex(i);
        const page = await fetchAnleggPage(offset, limit);
        if (!page.items.length) break;
        baseAccum.push(...page.items);
        if (page.total != null) singleton.expectedTotal = page.total;
        publish();
        if (page.items.length < limit) break;
        offset += limit;
        i++;
      }
    }

    // Wait for reports to finish so the final state is fully joined.
    await reportsPromise;
    publish();

    singleton.status = "done";
    singleton.finishedAt = new Date();
    if (singleton.expectedTotal == null) singleton.expectedTotal = baseAccum.length;
    emit();
  } catch (err) {
    singleton.error = err instanceof Error ? err.message : String(err);
    singleton.status = "error";
    emit();
  }
}

export function useAnleggLoader(): LoaderState {
  const [, force] = useState(0);

  useEffect(() => {
    const sub = () => force((n) => n + 1);
    singleton.subs.add(sub);
    startLoad();
    return () => {
      singleton.subs.delete(sub);
    };
  }, []);

  return {
    anlegg: singleton.anlegg,
    status: singleton.status,
    loadedCount: singleton.loadedCount,
    expectedTotal: singleton.expectedTotal,
    error: singleton.error,
    finishedAt: singleton.finishedAt,
  };
}
