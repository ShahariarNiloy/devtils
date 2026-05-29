import { issuerLabel } from "../jwt-claims";

export function IssuerLabel({ iss }: { iss: string }) {
  const label = issuerLabel(iss);
  if (!label) return null;
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-sm font-semibold"
      style={{
        background: "var(--color-mist-sage)",
        color: "var(--color-olive-ink)",
      }}
    >
      {label}
    </span>
  );
}
