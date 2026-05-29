"use client";

import { useMemo } from "react";

/**
 * Color-coded raw JWT, rendered as a `<pre>` that sits under a transparent
 * textarea (the overlay-editor technique). Header = text (theme-adaptive,
 * readable in light + dark), payload = sage-olive, signature = clay (the
 * only clay in this tool — a visual delimiter, not a tier signal), dots =
 * faint.
 */
export function JwtSegments({ value }: { value: string }) {
  const nodes = useMemo(() => {
    if (!value) return null;
    const parts = value.split(".");
    const names = ["header", "payload", "signature", "extra"];
    const cls = ["text-text", "text-sage-olive", "text-clay"];
    const out: React.ReactNode[] = [];
    parts.forEach((seg, i) => {
      const name = names[i] ?? `part-${i}`;
      if (i > 0) {
        out.push(
          <span key={`dot-before-${name}`} className="text-text-faint">
            .
          </span>,
        );
      }
      out.push(
        <span key={`seg-${name}`} className={cls[i] ?? "text-text-faint"}>
          {seg}
        </span>,
      );
    });
    return out;
  }, [value]);

  return (
    <pre
      aria-hidden
      className="m-0 h-full w-full overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-base leading-relaxed"
    >
      {nodes ?? (
        <span className="text-text-faint">Paste a JWT to decode…</span>
      )}
    </pre>
  );
}
