"use client";

import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Direction } from "../base64.types";

interface DirectionToggleProps {
  value: Direction;
  onChange: (d: Direction) => void;
}

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Conversion direction"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1"
    >
      <Pill
        active={value === "encode"}
        onClick={() => onChange("encode")}
        title="Encode anything to Base64"
        icon={<Lock size={13} aria-hidden />}
      >
        Encode
      </Pill>
      <Pill
        active={value === "decode"}
        onClick={() => onChange("decode")}
        title="Decode Base64 back to its original form"
        icon={<LockOpen size={13} aria-hidden />}
      >
        Decode
      </Pill>
    </div>
  );
}

function Pill({
  active, onClick, title, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer",
        active
          ? "bg-brand text-bg"
          : "text-text-muted hover:text-text",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
