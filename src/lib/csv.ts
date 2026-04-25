import type { Anlegg } from "../types";
import { sykShort } from "./sykdom";
import { STATUS_LABELS, årsakLabel } from "./cases";
import { artLabel } from "./arter";

const SEP = ";"; // Norwegian Excel default
const NL = "\r\n";

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes('"') || s.includes(SEP) || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const sliceDate = (s: string | null | undefined) => (s ? s.slice(0, 10) : "");

const COLUMNS: Array<[string, (a: Anlegg) => string | number]> = [
  ["Anleggs-ID", (a) => a.anleggId],
  ["Navn", (a) => a.anleggNavn ?? ""],
  ["Produksjonsform", (a) => (a.produksjonsform ?? []).join(" | ")],
  ["Arter", (a) => (a.arter ?? []).map(artLabel).join(" | ")],
  ["Eiere", (a) => (a.eiere ?? []).map((e) => e.navn).join(" | ")],
  ["Eiere-orgnr", (a) => (a.eiere ?? []).map((e) => e.id).join(" | ")],
  ["Antall sykdomstilfeller", (a) => a.sykdomstilfeller?.length ?? 0],
  [
    "Aktive tilfeller",
    (a) => (a.sykdomstilfeller ?? []).filter((c) => c.status === "aktiv").length,
  ],
  [
    "Sykdomstyper",
    (a) =>
      [...new Set((a.sykdomstilfeller ?? []).map((s) => sykShort(s.sykdomstype)))].join(" | "),
  ],
  [
    "Statuser",
    (a) =>
      [...new Set((a.sykdomstilfeller ?? []).map((s) => STATUS_LABELS[s.status]))].join(" | "),
  ],
  [
    "Siste diagnosedato",
    (a) => {
      const cases = a.sykdomstilfeller ?? [];
      if (!cases.length) return "";
      const max = cases
        .map((s) => s.diagnosedato ?? s.varslingsdato)
        .filter(Boolean)
        .sort()
        .at(-1);
      return sliceDate(max);
    },
  ],
];

const PER_CASE_COLUMNS: Array<[string, (a: Anlegg, i: number) => string | number]> = [
  ["Anleggs-ID", (a) => a.anleggId],
  ["Navn", (a) => a.anleggNavn ?? ""],
  ["Produksjonsform", (a) => (a.produksjonsform ?? []).join(" | ")],
  ["Eiere", (a) => (a.eiere ?? []).map((e) => e.navn).join(" | ")],
  ["Sak-ID", (a, i) => a.sykdomstilfeller[i]?.id ?? ""],
  [
    "Sykdomstype",
    (a, i) => {
      const c = a.sykdomstilfeller[i];
      return c ? sykShort(c.sykdomstype) : "";
    },
  ],
  ["Sykdomssubtype", (a, i) => a.sykdomstilfeller[i]?.sykdomssubtype ?? ""],
  [
    "Status",
    (a, i) => {
      const c = a.sykdomstilfeller[i];
      return c ? STATUS_LABELS[c.status] : "";
    },
  ],
  ["Arter", (a, i) => (a.sykdomstilfeller[i]?.arter ?? []).map(artLabel).join(" | ")],
  ["Varslingsdato", (a, i) => sliceDate(a.sykdomstilfeller[i]?.varslingsdato)],
  ["Mistanke (oppdretter)", (a, i) => sliceDate(a.sykdomstilfeller[i]?.oppdrettersMistankedato)],
  [
    "Mistanke (kvalitetssikret)",
    (a, i) => sliceDate(a.sykdomstilfeller[i]?.kvalitetssikretMistankedato),
  ],
  ["Diagnosedato", (a, i) => sliceDate(a.sykdomstilfeller[i]?.diagnosedato)],
  ["Avslutningsdato", (a, i) => sliceDate(a.sykdomstilfeller[i]?.avslutningsdato)],
  ["Avslutningsårsak", (a, i) => årsakLabel(a.sykdomstilfeller[i]?.avslutningsårsak ?? null)],
  ["Ugyldiggjøringsdato", (a, i) => sliceDate(a.sykdomstilfeller[i]?.ugyldiggjøringsdato)],
];

export type CsvMode = "anlegg" | "case";

export function anleggToCsv(rows: Anlegg[], mode: CsvMode = "anlegg"): string {
  if (mode === "case") {
    const header = PER_CASE_COLUMNS.map(([h]) => esc(h)).join(SEP);
    const body: string[] = [];
    for (const r of rows) {
      const cases = r.sykdomstilfeller ?? [];
      if (cases.length === 0) {
        body.push(PER_CASE_COLUMNS.map(([, fn]) => esc(fn(r, -1))).join(SEP));
      } else {
        for (let i = 0; i < cases.length; i++) {
          body.push(PER_CASE_COLUMNS.map(([, fn]) => esc(fn(r, i))).join(SEP));
        }
      }
    }
    return header + NL + body.join(NL) + NL;
  }
  const header = COLUMNS.map(([h]) => esc(h)).join(SEP);
  const body = rows.map((r) => COLUMNS.map(([, fn]) => esc(fn(r))).join(SEP)).join(NL);
  return header + NL + body + NL;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function csvFilename(rowCount: number, mode: CsvMode = "anlegg"): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`;
  const suffix = mode === "case" ? "tilfeller" : "anlegg";
  return `fiskehelse-${stamp}-${rowCount}${suffix}.csv`;
}
