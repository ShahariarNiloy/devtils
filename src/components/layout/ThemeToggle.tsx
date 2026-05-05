"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/primitives/Tooltip";

/**
 * Animated sun ↔ moon swap. Mounted only after hydration so the icon
 * matches the resolved theme without an SSR flash.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const current = mounted ? (resolvedTheme ?? theme ?? "dark") : "dark";
  const isDark = current === "dark";

  return (
    <Tooltip content={isDark ? "Switch to light" : "Switch to dark"}>
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
        aria-label="Toggle color theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isDark ? <Moon size={14} /> : <Sun size={14} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}
