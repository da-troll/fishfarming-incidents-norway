import type { Eier } from "../types";

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nb-NO", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtNumber(n: number): string {
  return n.toLocaleString("nb-NO");
}

export function fmtTime(d: Date = new Date()): string {
  return d.toLocaleTimeString("nb-NO");
}

export function fmtProduksjonsform(p: string): string {
  const lower = p.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function primaryEier(list: Eier[] | undefined): { name: string; more: number } | null {
  if (!list || !list.length) return null;
  return { name: list[0].navn, more: list.length - 1 };
}
