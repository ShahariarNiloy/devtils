"use client";

import { Copy } from "lucide-react";
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
    return <p className="mx-4 my-5 text-sm text-success-text">✓ No operations — the two documents are identical.</p>;
  }

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(patch, null, 2)).then(
      () => toast.success(`Copied ${patch.length} op${patch.length === 1 ? "" : "s"}`),
      () => toast.error("Couldn't access the clipboard"),
    );
  };

  return (
    <div>
      <header className="flex min-h-[50px] flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold">JSON Patch</span>
          <span className="font-mono text-xs text-text-faint">RFC 6902</span>
          <span className="ml-1 font-mono text-xs text-text-faint">
            · {patch.length} op{patch.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn-action inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold"
        >
          <Copy size={12} /> Copy patch
        </button>
      </header>

      <ul className="m-0 flex list-none flex-col gap-1.5 p-3">
        {patch.map((op, i) => {
          const key = `${op.op}-${op.path}-${"from" in op ? op.from : ""}-${i}`;
          return (
            <li key={key} className={cn("flex flex-col gap-1.5 rounded-[10px] px-3 py-2.5", opRowBg(op.op))}>
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
        <code className="break-all font-mono text-[13px] text-syntax-key">{op.path}</code>
        {"from" in op && (
          <>
            <span className="text-text-faint">←</span>
            <code className="break-all font-mono text-[13px] text-text-muted">
              {op.from}
            </code>
          </>
        )}
      </div>
      {"value" in op && (
        <code className="break-all rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-syntax-plain">
          {JSON.stringify(op.value)}
        </code>
      )}
    </>
  );
}

// Op chips sit on a dark tile (like the change list's sign tile) in the
// row's tone.
const OP_CHIP: Record<JsonPatchOp["op"], string> = {
  add: "bg-black/25 text-success-text",
  remove: "bg-black/25 text-error-text",
  move: "bg-black/25 text-info-text",
  replace: "bg-black/25 text-clay-cream",
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
  // Same tints as the change list so the two views read as one tool.
  switch (op) {
    case "add":
      return "bg-success/14";
    case "remove":
      return "bg-error/14";
    case "move":
      return "bg-info/14";
    case "replace":
    default:
      return "bg-clay-light/14";
  }
}
