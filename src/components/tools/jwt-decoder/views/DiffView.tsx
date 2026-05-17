"use client";

import { useMemo } from "react";
import { parseJwt } from "../jwt-decoder.lib";
import { isParseError } from "../jwt-decoder.types";

interface DiffViewProps {
  a: string;
  b: string;
  onA: (v: string) => void;
  onB: (v: string) => void;
}

type Row = { key: string; left?: string; right?: string; kind: string };

function payloadOf(raw: string): Record<string, unknown> | null {
  if (!raw.trim()) return null;
  const p = parseJwt(raw);
  return isParseError(p) ? null : p.payload;
}

function fmt(v: unknown): string {
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

export function DiffView({ a, b, onA, onB }: DiffViewProps) {
  const rows = useMemo<Row[]>(() => {
    const pa = payloadOf(a);
    const pb = payloadOf(b);
    if (!pa || !pb) return [];
    const keys = Array.from(
      new Set([...Object.keys(pa), ...Object.keys(pb)]),
    ).sort();
    return keys.map((key) => {
      const inA = key in pa;
      const inB = key in pb;
      const left = inA ? fmt(pa[key]) : undefined;
      const right = inB ? fmt(pb[key]) : undefined;
      let kind = "same";
      if (inA && !inB) kind = "removed";
      else if (!inA && inB) kind = "added";
      else if (left !== right) kind = "changed";
      return { key, left, right, kind };
    });
  }, [a, b]);

  const colorFor = (kind: string): string => {
    if (kind === "added") return "var(--color-success)";
    if (kind === "removed") return "var(--color-danger)";
    if (kind === "changed") return "var(--color-warning)";
    return "var(--color-text-muted)";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <textarea
          value={a}
          onChange={(e) => onA(e.target.value)}
          spellCheck={false}
          placeholder="First JWT…"
          aria-label="First JWT"
          className="h-28 w-full resize-none break-all rounded-lg border border-border bg-bg p-2.5 font-mono text-base text-text outline-none"
        />
        <textarea
          value={b}
          onChange={(e) => onB(e.target.value)}
          spellCheck={false}
          placeholder="Second JWT…"
          aria-label="Second JWT"
          className="h-28 w-full resize-none break-all rounded-lg border border-border bg-bg p-2.5 font-mono text-base text-text outline-none"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-faint">
          Paste two valid JWTs to compare their payload claims.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-bg">
          {rows.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-3 gap-2 border-b border-border-subtle px-3 py-2 text-base last:border-b-0"
            >
              <span
                className="font-mono font-semibold"
                style={{ color: colorFor(r.kind) }}
              >
                {r.key}
              </span>
              <span className="break-all font-mono text-text-muted">
                {r.left ?? "—"}
              </span>
              <span className="break-all font-mono text-text-muted">
                {r.right ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
