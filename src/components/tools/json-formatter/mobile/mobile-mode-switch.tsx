"use client";

import { Braces, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

export type MobileMode = "input" | "output";

interface MobileModeSwitchProps {
  mode: MobileMode;
  onModeChange: (m: MobileMode) => void;
  inputLabel?: string;
  outputLabel?: string;
}

export function MobileModeSwitch({
  mode,
  onModeChange,
  inputLabel,
  outputLabel,
}: MobileModeSwitchProps) {
  return (
    <div className="shrink-0 border-b border-border bg-bg px-3 py-2.5">
      <div className="flex gap-0.5 rounded-md border border-border-subtle bg-surface-soft p-0.5">
        <Tab
          active={mode === "input"}
          onClick={() => onModeChange("input")}
          icon={<Pencil size={13} />}
          label="Input"
          meta={inputLabel}
        />
        <Tab
          active={mode === "output"}
          onClick={() => onModeChange("output")}
          icon={<Braces size={13} />}
          label="Output"
          meta={outputLabel}
        />
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-sm font-semibold transition-[background,color,box-shadow] duration-150",
        active
          ? "bg-surface text-text shadow-[0_1px_2px_rgba(26,26,24,0.08)] dark:bg-surface-sage dark:shadow-none"
          : "text-text-faint hover:text-text-muted",
      )}
      aria-pressed={active}
    >
      <span className={active ? "text-brand" : "text-text-faint"}>{icon}</span>
      <span>{label}</span>
      {meta && (
        <span
          className={cn(
            "ml-0.5 rounded-sm px-1.5 py-px font-mono text-[10px] font-medium tracking-tight",
            active ? "bg-surface-soft text-text-muted" : "bg-surface text-text-faint",
          )}
        >
          {meta}
        </span>
      )}
    </button>
  );
}
