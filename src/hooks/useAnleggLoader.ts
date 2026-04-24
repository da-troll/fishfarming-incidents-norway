import { useEffect, useState } from "react";
import {
  fetchAnleggPage,
  FIRST_PAGE_SIZE,
  PARALLEL_CONCURRENCY,
  pageSizeForIndex,
} from "../lib/api";
import { sortAnlegg } from "../lib/filter";
import type { Anlegg, LoadStatus } from "../types";

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

async function startLoad() {
  if (singleton.started) return;
  singleton.started = true;
  singleton.status = "loading";
  emit();

  const accum: Anlegg[] = [];

  try {
    // 1. Fast first page — user sees rows in ~7s instead of ~20s
    const first = await fetchAnleggPage(0, FIRST_PAGE_SIZE);
    accum.push(...first.items);
    singleton.anlegg = sortAnlegg(accum);
    singleton.loadedCount = accum.length;
    singleton.expectedTotal = first.total;
    emit();

    const total = first.total;

    if (total != null && total > accum.length) {
      // 2a. Known total — build a ramp-then-bulk schedule and fetch in parallel.
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
          const i = next++;
          if (i >= pages.length) return;
          const { offset, limit } = pages[i];
          const page = await fetchAnleggPage(offset, limit);
          accum.push(...page.items);
          singleton.anlegg = sortAnlegg(accum);
          singleton.loadedCount = accum.length;
          emit();
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(PARALLEL_CONCURRENCY, pages.length) }, () => worker()),
      );
    } else if (total == null) {
      // 2b. Unknown total — paginate sequentially with the ramp schedule until
      // upstream returns a short page. Can't parallelize without knowing end.
      let offset = FIRST_PAGE_SIZE;
      let i = 0;
      for (;;) {
        const limit = pageSizeForIndex(i);
        const page = await fetchAnleggPage(offset, limit);
        if (!page.items.length) break;
        accum.push(...page.items);
        singleton.anlegg = sortAnlegg(accum);
        singleton.loadedCount = accum.length;
        if (page.total != null) singleton.expectedTotal = page.total;
        emit();
        if (page.items.length < limit) break;
        offset += limit;
        i++;
      }
    }

    singleton.status = "done";
    singleton.finishedAt = new Date();
    if (singleton.expectedTotal == null) singleton.expectedTotal = accum.length;
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
