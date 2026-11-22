import type { DiffKind } from "../json-diff.lib";

/** Per-kind sign, label and colours (text / tile background), from the mockup. */
export const KIND_LOOK: Record<DiffKind, { sign: string; label: string; text: string; tile: string; chip: string }> = {
  added: { sign: "+", label: "Added", text: "text-success-text", tile: "bg-success/14", chip: "added" },
  removed: { sign: "−", label: "Removed", text: "text-error-text", tile: "bg-error/14", chip: "removed" },
  changed: { sign: "~", label: "Changed", text: "text-[#f0c9a0]", tile: "bg-clay-light/14", chip: "changed" },
  type: { sign: "⇄", label: "Type changed", text: "text-[#c9a3e0]", tile: "bg-syntax-boolean/16", chip: "type" },
  moved: { sign: "↕", label: "Moved", text: "text-info-text", tile: "bg-info/14", chip: "moved" },
};

/** Order of the filter chips after "All". */
export const KIND_ORDER: readonly DiffKind[] = ["added", "removed", "changed", "type", "moved"];

/** The selected change's left-edge marker. */
export const CUR_RING = "shadow-[inset_3px_0_0_var(--color-clay-light)]";
