import { HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/primitives/tooltip";
import { STANDARD_CLAIMS, humanizeClaim } from "../jwt-claims";
import { IssuerLabel } from "./IssuerLabel";

export function ClaimRow({
  claimKey,
  value,
}: {
  claimKey: string;
  value: unknown;
}) {
  const meta = STANDARD_CLAIMS[claimKey];
  const humanized = humanizeClaim(claimKey, value);
  const raw =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  return (
    <div className="flex flex-col gap-0.5 border-b border-border-subtle py-2 last:border-b-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-base font-semibold text-text">
          {claimKey}
        </span>
        {meta && (
          <span className="text-sm text-text-faint">{meta.label}</span>
        )}
        {meta && (
          <Tooltip content={`${meta.rfcSection} — ${meta.description}`} side="top">
            <span
              className="inline-flex cursor-help text-text-faint"
              aria-label={`About the ${claimKey} claim`}
            >
              <HelpCircle size={12} aria-hidden />
            </span>
          </Tooltip>
        )}
        {claimKey === "iss" && typeof value === "string" && (
          <IssuerLabel iss={value} />
        )}
      </div>
      <span className="break-all font-mono text-base text-text-muted">
        {raw}
      </span>
      {meta?.isDate && (
        <span className="text-sm text-text-faint">{humanized}</span>
      )}
    </div>
  );
}
