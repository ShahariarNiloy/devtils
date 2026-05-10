"use client";

import { memo } from "react";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import type { matchAll } from "../regex.lib";

// ─── Component ─────────────────────────────────────────────────────────────────

export const ExtractPanel = memo(function ExtractPanel({
  matches,
}: {
  matches: ReturnType<typeof matchAll>;
}) {
  const groupCount = matches[0]?.groups.length ?? 0;
  const namedKeys  = matches[0] ? Object.keys(matches[0].named) : [];
  const hasGroups  = groupCount > 0 || namedKeys.length > 0;

  function copyTable() {
    if (!matches.length) return;
    const header = ["#", "Match", ...Array.from({ length: groupCount }, (_, i) => `$${i + 1}`), ...namedKeys].join("\t");
    const rows = matches.slice(0, 500).map((m, i) =>
      [i + 1, m.match, ...m.groups, ...namedKeys.map((k) => m.named[k])].join("\t"),
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    toast.success("Table copied as TSV");
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 h-10 border-b border-border-subtle shrink-0">
        <span className="text-sm font-semibold text-text">
          Captures
          {hasGroups && <span className="text-text-faint font-normal"> · {groupCount + namedKeys.length} groups</span>}
        </span>
        {matches.length > 0 && (
          <button
            type="button"
            onClick={copyTable}
            className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text transition-colors cursor-pointer"
          >
            <ClipboardCopy size={15} /> TSV
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {matches.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-faint">No matches yet.</div>
        ) : !hasGroups ? (
          <div className="py-10 text-center text-sm text-text-faint">
            Add capture groups <code className="font-mono">(…)</code> to extract values.
          </div>
        ) : (
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-2 text-text-faint font-medium w-8">#</th>
                <th className="text-left px-4 py-2 text-text-faint font-medium">Match</th>
                {Array.from({ length: groupCount }, (_, i) => (
                  <th key={i} className="text-left px-4 py-2 text-text-faint font-medium">${i + 1}</th>
                ))}
                {namedKeys.map((k) => (
                  <th key={k} className="text-left px-4 py-2 text-accent font-medium">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.slice(0, 500).map((m, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-b-0 hover:bg-surface-soft/60 transition-colors">
                  <td className="px-4 py-2 text-text-faint">{i + 1}</td>
                  <td className="px-4 py-2 text-text max-w-[8rem] truncate">{m.match}</td>
                  {m.groups.map((g, j) => (
                    <td key={j} className="px-4 py-2 text-text max-w-[8rem] truncate">
                      {g || <span className="text-text-faint/40">∅</span>}
                    </td>
                  ))}
                  {namedKeys.map((k) => (
                    <td key={k} className="px-4 py-2 text-text max-w-[8rem] truncate">
                      {m.named[k] || <span className="text-text-faint/40">∅</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
});
