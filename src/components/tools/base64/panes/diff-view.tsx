"use client";

interface DiffViewProps {
  original: string;
  encoded: string;
  match: boolean;
}

/** Original vs. decoded-then-re-encoded, so lost data is visible, not just flagged. */
export function DiffView({ original, encoded, match }: DiffViewProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className={`m-0 font-mono text-xs ${match ? "text-success" : "text-error"}`}>
        ● {match ? "Round-trip matches byte for byte" : "Round-trip mismatch — something was lost (check the charset)"}
      </p>
      <DiffColumn title="Your input" value={original} />
      <DiffColumn title="Encoded → decoded back" value={encoded} />
    </div>
  );
}

function DiffColumn({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface-panel rounded-xl p-3">
      <p className="m-0 mb-1.5 text-xs font-semibold text-text-faint">{title}</p>
      <pre className="m-0 font-mono text-[12.5px] leading-[1.7] break-all whitespace-pre-wrap text-syntax-plain">
        {value || <span className="text-text-ghost">(empty)</span>}
      </pre>
    </div>
  );
}
