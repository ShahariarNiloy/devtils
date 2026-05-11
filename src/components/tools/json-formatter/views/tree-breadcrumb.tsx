"use client";

import { memo, useMemo } from "react";
import { ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

/**
 * Path breadcrumb for the Tree view. Renders the JSONPath of the most
 * recently clicked node as a row of chips; clicking a chip copies the path
 * up to (and including) that segment.
 *
 * Performance:
 * - `splitPath` is memoized on the raw path string. The regex tokenize is
 *   O(path length) — trivial for paths up to a few hundred chars.
 * - The component itself is memoized. Tree-node clicks only re-render the
 *   breadcrumb (not the tree) because path is held in TreeView state and the
 *   onFocus callback is stable across renders.
 */

interface Segment {
  /** Visible label on the chip (no quoting, no brackets). */
  label: string;
  /** Full JSONPath up to and including this segment — what gets copied. */
  partial: string;
  /** True for array indices, so the chip can pick a quieter style. */
  isIndex: boolean;
}

function splitPath(path: string): Segment[] {
  const segs: Segment[] = [{ label: "$", partial: "$", isIndex: false }];
  if (path === "$" || !path) return segs;
  // Token regex covers .ident and ["…"] and [123] (mutually exclusive).
  const re = /\.([A-Za-z_$][A-Za-z0-9_$]*)|\[(\d+)\]|\[(?:"([^"]*)"|'([^']*)')\]/g;
  let m: RegExpExecArray | null;
  let lastIdx = 0;
  while ((m = re.exec(path)) !== null) {
    const partial = path.slice(0, m.index + m[0].length);
    if (m[1] !== undefined) {
      segs.push({ label: m[1], partial, isIndex: false });
    } else if (m[2] !== undefined) {
      segs.push({ label: `[${m[2]}]`, partial, isIndex: true });
    } else if (m[3] !== undefined || m[4] !== undefined) {
      segs.push({ label: m[3] ?? m[4] ?? "", partial, isIndex: false });
    }
    lastIdx = m.index + m[0].length;
  }
  // Anything we didn't match (malformed tail) — render as a fallback chip.
  if (lastIdx < path.length) {
    segs.push({ label: path.slice(lastIdx), partial: path, isIndex: false });
  }
  return segs;
}

interface TreeBreadcrumbProps {
  path: string;
}

function TreeBreadcrumbImpl({ path }: TreeBreadcrumbProps) {
  const segments = useMemo(() => splitPath(path), [path]);

  const handleCopy = async (partial: string) => {
    try {
      await navigator.clipboard.writeText(partial);
      toast.success("Path copied");
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  const handleCopyAll = async () => {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(path);
      toast.success("Path copied");
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border-subtle bg-surface px-3 text-sm font-mono overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1 min-w-0">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={seg.partial} className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void handleCopy(seg.partial)}
                className={cn(
                  "rounded px-1.5 py-0.5 transition-colors",
                  isLast
                    ? "text-text font-semibold hover:bg-surface-soft"
                    : "text-text-faint hover:text-text hover:bg-surface-soft",
                  seg.isIndex && !isLast && "opacity-80",
                )}
                title={`Copy ${seg.partial}`}
              >
                {seg.label}
              </button>
              {!isLast && (
                <ChevronRight size={12} className="text-text-faint shrink-0" aria-hidden />
              )}
            </span>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleCopyAll()}
        disabled={!path || path === "$"}
        className={cn(
          "ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors",
          "disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-faint",
        )}
        aria-label="Copy full path"
        title="Copy full path"
      >
        <Copy size={13} />
      </button>
    </div>
  );
}

export const TreeBreadcrumb = memo(TreeBreadcrumbImpl);
