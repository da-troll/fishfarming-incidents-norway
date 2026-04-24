import { fmtNumber, fmtTime } from "../lib/format";
import type { LoadStatus } from "../types";
import { Spinner } from "./Spinner";

interface Props {
  total: number;
  withCases: number;
  expectedTotal: number | null;
  status: LoadStatus;
  finishedAt: Date | null;
  error: string | null;
}

export function Masthead({
  total,
  withCases,
  expectedTotal,
  status,
  finishedAt,
  error,
}: Props) {
  const loading = status === "loading" || status === "idle";

  let statusNode: React.ReactNode;
  if (status === "error") {
    statusNode = <span className="status-err">feil: {error ?? "ukjent"}</span>;
  } else if (loading) {
    statusNode = (
      <span className="status-loading">
        <Spinner size={11} />
        <span style={{ marginLeft: 8 }}>laster …</span>
      </span>
    );
  } else if (finishedAt) {
    statusNode = `ferdig kl. ${fmtTime(finishedAt)}`;
  }

  const anleggNode =
    loading && expectedTotal ? (
      <>
        <span className="num">{fmtNumber(total)}</span>
        <span className="num-denom"> / {fmtNumber(expectedTotal)}</span> anlegg
      </>
    ) : (
      <>
        <span className="num">{total ? fmtNumber(total) : "—"}</span> anlegg
      </>
    );

  return (
    <header className="masthead">
      <div>
        <h1>
          Fiskehelseregisteret <em>— anleggsoversikt</em>
        </h1>
        <div className="sub">Live · via lokal proxy · Mattilsynet</div>
      </div>
      <div className="meta meta-row">
        {statusNode && <span className="meta-item meta-status">{statusNode}</span>}
        <span className="meta-item">{anleggNode}</span>
        <span className="meta-item">
          <span className="num alarm">{total ? fmtNumber(withCases) : "—"}</span> med
          sykdomstilfeller
        </span>
      </div>
    </header>
  );
}
