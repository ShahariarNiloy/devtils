/** Shared bits for the Arithmetic-mode panels. */

export const FIELD =
  "h-9 rounded-lg border border-border bg-surface px-3 font-mono text-sm text-text outline-none focus:outline-2 focus:outline-offset-2 focus:outline-brand";

export function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-text-muted">{k}</dt>
      <dd className="font-mono text-text break-all">{v}</dd>
    </div>
  );
}
