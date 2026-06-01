"use client";

import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { JsonPatchOp } from "../json-diff.lib";

/**
 * RFC 6902 patch document — the operational form of the diff. Each row
 * is one op rendered as a compact card: op-tag chip + path + value
 * (when relevant). One copy-all button at the top emits the whole patch
 * as formatted JSON — drop straight into a PATCH request body.
 */
export function PatchView({ patch }: { patch: JsonPatchOp[] }) {
  if (patch.length === 0) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-success-border bg-success-bg px-4 py-8 text-success-text">
        <Sparkles size={16} />
        <span className="text-sm font-medium">
          No operations — values are identical
        </span>
      </div>
    );
  }

  const copy = () => {
    void navigator.clipboard.writeText(JSON.stringify(patch, null, 2));
    toast.success(
      `Copied ${patch.length} op${patch.length === 1 ? "" : "s"}`,
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex h-11 items-center justify-between border-b border-border-subtle px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
            JSON Patch
          </span>
          <span className="font-mono text-xs text-text-faint">RFC 6902</span>
          <span className="ml-1 font-mono text-xs text-text-faint">
            · {patch.length} op{patch.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          <Copy size={12} /> Copy patch
        </button>
      </header>

      <ul className="divide-y divide-border-subtle">
        {patch.map((op, i) => {
          const key = `${op.op}-${op.path}-${"from" in op ? op.from : ""}-${i}`;
          return (
            <li key={key} className={cn("flex flex-col gap-1.5 px-4 py-3", opRowBg(op.op))}>
              <PatchRow op={op} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PatchRow({ op }: { op: JsonPatchOp }) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <OpTag op={op.op} />
        <code className="break-all font-mono text-sm text-text">{op.path}</code>
        {"from" in op && (
          <>
            <span className="text-text-faint">←</span>
            <code className="break-all font-mono text-sm text-text-muted">
              {op.from}
            </code>
          </>
        )}
      </div>
      {"value" in op && (
        <code className="break-all rounded-md bg-surface-2/60 px-2 py-1 font-mono text-sm text-text">
          {JSON.stringify(op.value)}
        </code>
      )}
    </>
  );
}

// Op chips use the same earth-tone palette as the diff cells — solid
// pale background with confident text colour. Reads as "tag", not as a
// blob of opacity-blended noise.
const OP_CHIP: Record<JsonPatchOp["op"], string> = {
  add: "bg-success-bg text-success-text",
  remove: "bg-error-bg text-error-text",
  move: "bg-info-bg text-info-text",
  replace: "bg-warning-bg text-warning-text",
};

function OpTag({ op }: { op: JsonPatchOp["op"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider",
        OP_CHIP[op],
      )}
    >
      {op}
    </span>
  );
}

function opRowBg(op: JsonPatchOp["op"]): string {
  // Same wash logic as the result tree — solid earth-tone bg at 40% so
  // the chip pops without flattening the value chip beneath it.
  switch (op) {
    case "add":
      return "bg-success-bg/40";
    case "remove":
      return "bg-error-bg/40";
    case "move":
      return "bg-info-bg/30";
    case "replace":
    default:
      return "bg-warning-bg/40";
  }
}
