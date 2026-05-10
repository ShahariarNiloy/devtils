"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { CollapsedBar, ExpandedBar } from "./components/pattern-bar-views";
import type { MobileState } from "./types";

interface StickyPatternBarProps {
  state: MobileState;
  onOpenSamples?: () => void;
}

export function StickyPatternBar({ state, onOpenSamples }: StickyPatternBarProps) {
  const isExpanded = state.activeView === "editor";

  return (
    <motion.div
      layout
      transition={{ type: "spring", duration: 0.22, bounce: 0 }}
      className={cn(
        "sticky top-12 z-30",
        isExpanded ? "bg-bg" : "bg-surface border-b border-border-subtle"
      )}
    >
      {isExpanded ? (
        <ExpandedBar state={state} onOpenSamples={onOpenSamples} />
      ) : (
        <CollapsedBar state={state} />
      )}
    </motion.div>
  );
}
