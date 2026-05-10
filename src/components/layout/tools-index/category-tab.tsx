"use client";

import { cn } from "@/lib/cn";
import React from "react";

interface CategoryTabProps {
  active: boolean;
  onClick: () => void;
  pip?: string;
  children: React.ReactNode;
}

export function CategoryTab({ active, onClick, pip, children }: CategoryTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-sm font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer",
        active
          ? "bg-[color:var(--color-brand)] text-[color:var(--color-text-on-sage)]"
          : "text-text-muted hover:bg-surface-soft hover:text-text",
      )}
    >
      {pip && (
        <span
          className="h-1.5 w-1.5 rounded-sm shrink-0"
          style={{ background: active ? "var(--color-mist-sage)" : pip }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
