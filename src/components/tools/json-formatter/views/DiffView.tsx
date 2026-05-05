"use client";

import { useState } from "react";
import {
  diffJson,
  parseJson,
} from "@/components/tools/json-formatter/json-formatter.lib";
import type { DiffResult } from "@/components/tools/json-formatter/json-formatter.types";

export interface DiffViewProps {
  originalInput: string;
  diffInput: string;
  onDiffInputChange: (v: string) => void;
}

export function DiffView({ originalInput, diffInput, onDiffInputChange }: DiffViewProps) {
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = () => {
    setError(null);
    setResult(null);
    try {
      const a = parseJson(originalInput.trim() || "null");
      const b = parseJson(diffInput.trim() || "null");
      setResult(diffJson(a, b));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse error");
    }
  };

  const hasNoDiff =
    result !== null &&
    result.added.length === 0 &&
    result.removed.length === 0 &&
    result.changed.length === 0;

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-auto">
      {/* Two columns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Original (left) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-muted">Original</span>
          <textarea
            value={originalInput}
            readOnly
            spellCheck={false}
            className="h-52 resize-none rounded-xl border border-border-subtle bg-surface-soft px-3 py-2.5 font-mono text-sm leading-code text-text-muted outline-none"
          />
        </div>

        {/* Compare (right) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-muted">Compare</span>
          <textarea
            value={diffInput}
            onChange={(e) => onDiffInputChange(e.target.value)}
            spellCheck={false}
            placeholder="Paste JSON to compare…"
            className="h-52 resize-none rounded-xl border border-border-subtle bg-surface px-3 py-2.5 font-mono text-sm leading-code text-text placeholder:text-text-faint outline-none transition-[border-color] focus:border-brand"
          />
        </div>
      </div>

      {/* Compare button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCompare}
          className="inline-flex items-center justify-center h-9 px-5 rounded-lg bg-brand text-bg text-sm font-semibold hover:bg-brand-hover transition-colors active:scale-[0.98]"
        >
          Compare
        </button>

        {error && (
          <span className="text-sm text-danger">{error}</span>
        )}
      </div>

      {/* Results */}
      {result !== null && (
        <div className="flex flex-col gap-3">
          {/* Summary */}
          <div className="text-sm text-text-muted">
            {hasNoDiff ? (
              <span className="text-success font-medium">No differences</span>
            ) : (
              <span>
                {result.added.length > 0 && (
                  <span className="text-brand font-medium">{result.added.length} added</span>
                )}
                {result.added.length > 0 && (result.removed.length > 0 || result.changed.length > 0) && (
                  <span className="mx-2 text-text-faint">·</span>
                )}
                {result.removed.length > 0 && (
                  <span className="text-danger font-medium">{result.removed.length} removed</span>
                )}
                {result.removed.length > 0 && result.changed.length > 0 && (
                  <span className="mx-2 text-text-faint">·</span>
                )}
                {result.changed.length > 0 && (
                  <span className="text-text-muted font-medium">{result.changed.length} changed</span>
                )}
              </span>
            )}
          </div>

          {/* Path lists */}
          <div className="flex flex-col gap-3">
            {result.added.length > 0 && (
              <div>
                <p className="text-sm text-text-faint font-medium mb-2">Added</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.added.map((path) => (
                    <code
                      key={path}
                      className="text-brand bg-brand/10 px-1.5 py-0.5 rounded font-mono text-sm"
                    >
                      {path}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {result.removed.length > 0 && (
              <div>
                <p className="text-sm text-text-faint font-medium mb-2">Removed</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.removed.map((path) => (
                    <code
                      key={path}
                      className="text-danger bg-danger/10 px-1.5 py-0.5 rounded font-mono text-sm"
                    >
                      {path}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {result.changed.length > 0 && (
              <div>
                <p className="text-sm text-text-faint font-medium mb-2">Changed</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.changed.map((path) => (
                    <code
                      key={path}
                      className="text-text-muted bg-surface-soft px-1.5 py-0.5 rounded font-mono text-sm"
                    >
                      {path}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
