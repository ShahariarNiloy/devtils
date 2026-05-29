import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import type { SecurityWarning } from "../jwt-decoder.types";

const TONE: Record<
  SecurityWarning["severity"],
  { color: string; Icon: typeof Info }
> = {
  critical: { color: "var(--color-danger)", Icon: ShieldAlert },
  warning: { color: "var(--color-warning)", Icon: AlertTriangle },
  info: { color: "var(--color-info)", Icon: Info },
};

export function SecurityWarnings({
  warnings,
}: {
  warnings: SecurityWarning[];
}) {
  if (warnings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold uppercase tracking-tag text-text-faint">
        Security
      </span>
      {warnings.map((w) => {
        const { color, Icon } = TONE[w.severity];
        return (
          <details
            key={w.title}
            className="rounded-lg border border-border bg-surface px-3 py-2 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-text">
              <Icon size={14} aria-hidden style={{ color }} />
              {w.title}
            </summary>
            <p className="mt-1.5 pl-6 text-sm leading-snug-2 text-text-muted">
              {w.description}
            </p>
          </details>
        );
      })}
    </div>
  );
}
