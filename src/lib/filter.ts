import type { Anlegg, FilterCriteria } from "../types";

export function filterAnlegg(anlegg: Anlegg[], c: FilterCriteria): Anlegg[] {
  const qRaw = c.query.trim().toLowerCase();
  const asNum = /^\d+$/.test(qRaw) ? Number(qRaw) : null;

  return anlegg.filter((a) => {
    if (c.onlyWithCases && !(a.sykdomstilfeller?.length ?? 0)) return false;
    if (c.sykdomstype && !(a.sykdomstilfeller ?? []).some((s) => s.sykdomstype === c.sykdomstype))
      return false;
    if (c.produksjonsform && !(a.produksjonsform ?? []).includes(c.produksjonsform)) return false;
    if (qRaw) {
      if (asNum !== null) {
        if (a.anleggId !== asNum && !String(a.anleggId).includes(qRaw)) return false;
      } else {
        const navn = (a.anleggNavn ?? "").toLowerCase();
        const eiere = (a.eiere ?? []).map((e) => (e.navn ?? "").toLowerCase()).join(" ");
        if (!navn.includes(qRaw) && !eiere.includes(qRaw)) return false;
      }
    }
    return true;
  });
}

export function sortAnlegg(list: Anlegg[]): Anlegg[] {
  return [...list].sort((a, b) => {
    const ac = a.sykdomstilfeller?.length ?? 0;
    const bc = b.sykdomstilfeller?.length ?? 0;
    if (bc !== ac) return bc - ac;
    return (a.anleggNavn ?? "").localeCompare(b.anleggNavn ?? "", "nb");
  });
}
