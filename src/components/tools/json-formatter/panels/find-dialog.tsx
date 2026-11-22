"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/primitives/dialog";
import { SearchPanel } from "./search-panel";

interface FindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parsed JSON document (output if present, else parsed input). */
  value: unknown;
}

/**
 * "Find" (⌘/): fuzzy search over keys, paths and values, or a JSONPath query
 * when the text starts with `$`. A dialog, like the ⌘K palette — it floats
 * over the workspace instead of pushing it down. Picking a result copies its
 * path and closes.
 */
export function FindDialog({ open, onOpenChange, value }: FindDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        aria-describedby={undefined}
        className="top-[12%] w-[min(760px,calc(100vw-32px))] overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Find in document</DialogTitle>
        <SearchPanel value={value} onPicked={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
