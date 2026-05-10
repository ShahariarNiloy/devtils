"use client";

import type { MobileState } from "../types";
import { Accordion } from "../components/mobile-accordion";
import { MatchRow } from "../components/match-row";

// ── Match panel ─────────────────────────────────────────────────────────────

export function MatchPanel({ state }: { state: MobileState }) {
  const { matches, setSelectedMatch } = state;
  const count = matches.length;
  const isEmpty = count === 0;

  return (
    <Accordion
      triggerLabel={
        isEmpty ? (
          <>0 matches <span className="text-text-faint font-normal">— nothing matches</span></>
        ) : (
          <>{count} {count === 1 ? "match" : "matches"}</>
        )
      }
      disabled={isEmpty}
    >
      <div className="max-h-72 overflow-y-auto px-3 pt-2 pb-3 space-y-2">
        {matches.slice(0, 200).map((m, i) => (
          <MatchRow
            key={`${m.index}-${i}`}
            match={m}
            index={i}
            onClick={(j) => setSelectedMatch(j)}
          />
        ))}
        {matches.length > 200 && (
          <p className="py-2 text-center text-sm text-text-faint">
            Showing 200 of {matches.length}
          </p>
        )}
      </div>
    </Accordion>
  );
}

// ── Replace panel ───────────────────────────────────────────────────────────

export function ReplacePanel({ state }: { state: MobileState }) {
  const { replacement, setReplacement, replaced } = state;

  return (
    <Accordion triggerLabel="Replace" defaultOpen>
      <div className="px-3 py-3 space-y-2.5">
        <label className="block">
          <span className="text-sm font-medium text-text-faint">Replacement</span>
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="e.g. [$&] or $1"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className="mt-1.5 w-full h-10 rounded-lg border border-border bg-bg px-3 font-mono text-base text-text placeholder:text-text-faint outline-none focus:border-border-strong transition-colors"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-text-faint">Output</span>
          <pre className="mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-border-subtle bg-surface p-3 font-mono text-base leading-relaxed text-text whitespace-pre-wrap break-words m-0">
            {replaced || <span className="text-text-faint italic">Output appears here…</span>}
          </pre>
        </div>
      </div>
    </Accordion>
  );
}

// ── Split panel ─────────────────────────────────────────────────────────────

export function SplitPanel({ state }: { state: MobileState }) {
  const { parts } = state;
  const count = parts.length;

  return (
    <Accordion
      triggerLabel={<>{count} {count === 1 ? "part" : "parts"}</>}
      defaultOpen
    >
      <div className="max-h-72 overflow-y-auto">
        {parts.map((part, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-3.5 py-2.5 border-b border-border-subtle last:border-b-0"
          >
            <span className="font-mono text-sm text-text-faint w-8 shrink-0 pt-px">[{i}]</span>
            <code className="font-mono text-base text-text break-all flex-1">
              {part === "" ? <span className="text-text-faint italic">empty</span> : part}
            </code>
          </div>
        ))}
      </div>
    </Accordion>
  );
}

// ── Extract panel ───────────────────────────────────────────────────────────

export function ExtractPanel({ state }: { state: MobileState }) {
  const { matches } = state;
  const groupCount  = matches[0]?.groups.length ?? 0;
  const namedKeys   = matches[0] ? Object.keys(matches[0].named) : [];
  const totalGroups = groupCount + namedKeys.length;
  const hasGroups   = totalGroups > 0;
  const isEmpty     = matches.length === 0 || !hasGroups;

  return (
    <Accordion
      triggerLabel={
        matches.length === 0 ? (
          <>Captures <span className="text-text-faint font-normal">— no matches</span></>
        ) : !hasGroups ? (
          <>Captures <span className="text-text-faint font-normal">— add (…) groups to capture</span></>
        ) : (
          <>{totalGroups} {totalGroups === 1 ? "capture" : "captures"} per match</>
        )
      }
      disabled={isEmpty}
      defaultOpen
    >
      <div className="max-h-72 overflow-y-auto px-3 pt-2 pb-3 space-y-2">
        {matches.slice(0, 200).map((m, i) => (
          <div
            key={`${m.index}-${i}`}
            className="rounded-lg border border-border-subtle bg-surface p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-text-muted">#{i + 1}</span>
              <span className="font-mono text-base text-text truncate">{m.match || "(empty)"}</span>
            </div>
            {(m.groups.length > 0 || namedKeys.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {m.groups.map((g, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1 rounded bg-surface-soft px-2 py-0.5 font-mono text-sm"
                  >
                    <span className="text-text-faint">${j + 1}</span>
                    <span className="text-text">{g || "∅"}</span>
                  </span>
                ))}
                {namedKeys.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded bg-accent-soft px-2 py-0.5 font-mono text-sm"
                  >
                    <span className="text-accent">{k}</span>
                    <span className="text-text">{m.named[k] || "∅"}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Accordion>
  );
}
