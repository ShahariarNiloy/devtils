import { AlertCircle, CheckCircle2, ShieldQuestion } from "lucide-react";
import type { VerificationResult } from "../jwt-decoder.types";

/** Inline verification status — used as the Verification card footer. */
export function VerifyStatus({
  verification,
}: {
  verification: VerificationResult | null;
}) {
  if (verification === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-text-faint">
        <ShieldQuestion size={13} aria-hidden />
        Not verified — paste a key or secret above.
      </span>
    );
  }
  if (verification.status === "valid") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: "var(--color-success)" }}
      >
        <CheckCircle2 size={13} aria-hidden />
        Valid signature
      </span>
    );
  }
  const text =
    verification.status === "unsupported"
      ? verification.reason
      : `Invalid — ${verification.reason}`;
  return (
    <span
      className="inline-flex items-start gap-1.5 text-sm font-medium"
      style={{ color: "var(--color-danger)" }}
    >
      <AlertCircle size={13} aria-hidden className="mt-0.5 shrink-0" />
      {text}
    </span>
  );
}
