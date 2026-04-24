interface Props {
  size?: number;
  inverse?: boolean;
}

export function Spinner({ size = 14, inverse = false }: Props) {
  return (
    <span
      className={"spinner" + (inverse ? " spinner-inverse" : "")}
      style={{ width: size, height: size }}
      aria-label="Laster"
      role="status"
    />
  );
}
