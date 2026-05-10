"use client";

interface DiffViewProps {
  original: string;
  encoded: string;
}

export function DiffView({ original, encoded }: DiffViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <DiffColumn title="Original input" value={original} />
      <DiffColumn title="Decoded → re-encoded" value={encoded} />
      <p className="col-span-2 text-sm text-text-faint italic">
        Round-trip diff: shows any data lost in the encoding cycle.
      </p>
    </div>
  );
}

function DiffColumn({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-button border border-border-subtle bg-surface-soft/40 p-3">
      <p className="text-sm uppercase tracking-wider font-semibold text-text-faint mb-1.5">{title}</p>
      <pre className="m-0 font-mono text-sm leading-relaxed text-text whitespace-pre-wrap break-all">
        {value || <span className="text-text-faint italic">(empty)</span>}
      </pre>
    </div>
  );
}
