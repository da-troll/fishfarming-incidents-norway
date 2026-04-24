import type { Anlegg } from "../types";
import { DiseaseBadge } from "./DiseaseBadge";
import { sykFull } from "../lib/sykdom";
import { fmtDate } from "../lib/format";

interface Props {
  anlegg: Anlegg | null;
  onClose: () => void;
}

export function DetailPanel({ anlegg, onClose }: Props) {
  const isOpen = anlegg !== null;

  if (!anlegg) {
    return (
      <aside className="detail" aria-hidden={!isOpen}>
        <div className="ph">Velg et anlegg for detaljer</div>
      </aside>
    );
  }

  const cases = anlegg.sykdomstilfeller ?? [];
  const eiere = anlegg.eiere ?? [];
  const prod = anlegg.produksjonsform ?? [];
  const arter = anlegg.arter ?? [];

  return (
    <aside className="detail detail-open" aria-hidden={!isOpen}>
      <button
        type="button"
        className="detail-close"
        onClick={onClose}
        aria-label="Lukk detaljer"
      >
        <span aria-hidden>×</span>
      </button>
      <h2>{anlegg.anleggNavn || "—"}</h2>
      <div className="d-id">
        Lokalitetsnr. {anlegg.anleggId} &nbsp;·&nbsp;{" "}
        <a
          href="https://sikker.fiskeridir.no/akvakulturregisteret/web/sites"
          target="_blank"
          rel="noopener noreferrer"
        >
          Akvakulturregisteret ↗
        </a>
      </div>

      <section>
        <h3>Sykdomstilfeller ({cases.length})</h3>
        {cases.length ? (
          cases.map((c, i) => (
            <div className="case-row" key={`${c.sykdomstype}-${i}`}>
              <DiseaseBadge sykdomstype={c.sykdomstype} variant="solid" />
              <div>
                <div className="case-name">{sykFull(c.sykdomstype)}</div>
              </div>
              <div className="case-date">{fmtDate(c.diagnoseDato)}</div>
            </div>
          ))
        ) : (
          <div className="no-cases" style={{ padding: "6px 0" }}>
            Ingen registrerte sykdomstilfeller
          </div>
        )}
      </section>

      <section>
        <h3>Eiere</h3>
        {eiere.length ? (
          <ul className="eiere">
            {eiere.map((e) => (
              <li key={e.id}>
                {e.navn}
                <span className="eier-id">{e.id}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="dim">—</div>
        )}
      </section>

      <section>
        <h3>Produksjonsform</h3>
        {prod.length ? (
          prod.map((p) => (
            <span className="tag" key={p}>
              {p}
            </span>
          ))
        ) : (
          <div className="dim">—</div>
        )}
      </section>

      <section>
        <h3>Arter</h3>
        {arter.length ? (
          arter.map((a) => (
            <span className="tag" key={a}>
              {a}
            </span>
          ))
        ) : (
          <div className="dim">—</div>
        )}
      </section>
    </aside>
  );
}
