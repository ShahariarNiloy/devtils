"use client";

import { motion } from "framer-motion";
import { Asterisk, FileText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MobileState, MobileView } from "./types";

interface TabConfig {
  view: MobileView;
  icon: LucideIcon;
  label: string;
}

const TABS: TabConfig[] = [
  { view: "editor",  icon: FileText, label: "Editor" },
  { view: "explain", icon: Asterisk, label: "Explain" },
];

interface MobileTabBarProps {
  state: MobileState;
}

export function MobileTabBar({ state }: MobileTabBarProps) {
  const { activeView, setActiveView, isKeyboardOpen } = state;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none",
        "pb-[env(safe-area-inset-bottom)]",
        "transition-transform duration-200",
        isKeyboardOpen && "translate-y-full",
      )}
    >
      <nav
        aria-label="Regex tester views"
        className={cn(
          "pointer-events-auto mb-4",
          "flex items-center gap-1 p-1.5",
          "rounded-full border border-border-subtle bg-surface/95 backdrop-blur shadow-float",
        )}
      >
        {TABS.map(({ view, icon: Icon, label }) => {
          const active = activeView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              aria-pressed={active}
              className={cn(
                "relative inline-flex items-center gap-2 h-10 px-4 rounded-full cursor-pointer",
                "transition-colors duration-150",
                active ? "text-olive-ink" : "text-text-muted hover:text-text",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-dock-active"
                  transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.7 }}
                  className="absolute inset-0 rounded-full bg-mist-sage shadow-sm"
                  aria-hidden
                />
              )}
              <Icon size={18} aria-hidden className="relative z-10" />
              <span className={cn("relative z-10 text-sm", active && "font-medium")}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
