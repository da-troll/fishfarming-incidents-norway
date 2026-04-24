import { sykFull, sykShort } from "../lib/sykdom";

interface Props {
  sykdomstype: string;
  variant?: "inline" | "solid";
}

export function DiseaseBadge({ sykdomstype, variant = "inline" }: Props) {
  const className = variant === "solid" ? "case-badge" : "badge";
  return (
    <span className={className} title={sykFull(sykdomstype)}>
      {sykShort(sykdomstype)}
    </span>
  );
}
