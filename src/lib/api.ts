import type { Anlegg } from "../types";

// Upstream latency is ~linear in page size: limit=50 ≈ 7s, limit=200 ≈ 20s,
// limit=500 ≈ 42s. Smaller pages = rows on screen sooner. Ramp up so the
// first few waves feel fast, then settle at 200 for throughput.
export const FIRST_PAGE_SIZE = 50;
export const BULK_PAGE_SIZE = 200;
// Upstream throttles hard beyond 2 in-flight requests: individual latency
// balloons from ~9s to ~30s with 4 concurrent. 2 gives the best throughput.
export const PARALLEL_CONCURRENCY = 2;

// Page-size schedule AFTER the first (50) page: 100×3, 150×3, then 200 forever.
// Rows stream in at an accelerating cadence — user perceives continuous motion
// rather than a jump from 50 → 200.
const RAMP: number[] = [100, 100, 100, 150, 150, 150];

export function pageSizeForIndex(i: number): number {
  return i < RAMP.length ? RAMP[i] : BULK_PAGE_SIZE;
}

export interface AnleggPage {
  items: Anlegg[];
  total: number | null;
}

export async function fetchAnleggPage(offset: number, limit: number): Promise<AnleggPage> {
  const url = `/api/fiskehelseregisteret/v1/anlegg?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = (await res.json()) as Anlegg[];
  const totalHeader = res.headers.get("x-count");
  const total = totalHeader ? Number(totalHeader) : null;
  return { items, total: Number.isFinite(total) ? total : null };
}
