import type { Anlegg, Sykdomstilfelle } from "../types";
import { sykFull } from "../lib/sykdom";
import { fmtDate } from "../lib/format";
import { STATUS_LABELS, årsakLabel } from "../lib/cases";
import { artLabel } from "../lib/arter";

interface Props {
  anlegg: Anlegg | null;
  onClose: () => void;
}

function CaseTimeline({ c }: { c: Sykdomstilfelle }) {
  const rows: Array<[string, string | null]> = [
    ["Mistanke (oppdretter)", c.oppdrettersMistankedato],
    ["Mistanke (kvalitetssikret)", c.kvalitetssikretMistankedato],
    ["Varsling", c.varslingsdato],
    ["Diagnose", c.diagnosedato],
    ["Avsluttet", c.avslutningsdato],
    ["Ugyldiggjort", c.ugyldiggjøringsdato],
  ].filter(([, v]) => v !== null) as Array<[string, string]>;
  return (
    <dl className="case-timeline">
      {rows.map(([label, val]) => (
        <div key={label} className="case-tl-row">
          <dt>{label}</dt>
          <dd>{fmtDate(val)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailPanel({ anlegg, onClose }: Props) {
  const isOpen = anlegg !== null;

  if (!anlegg) {
    return (
      <aside className="detail detail-rail" aria-hidden={!isOpen}>
        <div className="detail-rail-hint" aria-hidden>
          <span>Velg anlegg →</span>
        </div>
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
          cases.map((c) => (
            <div className={`case-block status-${c.status}`} key={c.id}>
              <div className="case-block-head">
                <div className="case-block-title">
                  <div className="case-name">{sykFull(c.sykdomstype)}</div>
                  {c.sykdomssubtype && (
                    <div className="case-subtype">{c.sykdomssubtype}</div>
                  )}
                </div>
                <span className={`status-pill status-pill-${c.status}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              {c.arter.length > 0 && (
                <div className="case-arter">
                  {c.arter.map((a) => (
                    <span className="tag" key={a}>
                      {artLabel(a)}
                    </span>
                  ))}
                </div>
              )}
              <CaseTimeline c={c} />
              {c.avslutningsårsak && (
                <div className="case-årsak">
                  <span className="case-årsak-label">Årsak:</span>{" "}
                  {årsakLabel(c.avslutningsårsak)}
                </div>
              )}
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
              {artLabel(a)}
            </span>
          ))
        ) : (
          <div className="dim">—</div>
        )}
      </section>
    </aside>
  );
}
