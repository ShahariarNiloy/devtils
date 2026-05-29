"use client";

import {
  Calculator,
  Clock,
  List,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ToolMode } from "../timestamp-converter.types";

interface TabDef {
  id: ToolMode;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "single", label: "Single", icon: Clock },
  { id: "compare", label: "Compare", icon: Rows3 },
  { id: "arithmetic", label: "Arithmetic", icon: Calculator },
  { id: "batch", label: "Batch", icon: List },
];

interface Props {
  mode: ToolMode;
  onMode: (m: ToolMode) => void;
}

export function ModeTabs({ mode, onMode }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tool mode"
      className="flex items-center justify-center gap-1 border-b border-border-subtle"
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onMode(t.id)}
            className={cn(
              "-mb-px inline-flex h-10 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors cursor-pointer",
              active
                ? "border-brand text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            <Icon
              size={14}
              aria-hidden
              className={active ? "text-brand" : undefined}
            />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
