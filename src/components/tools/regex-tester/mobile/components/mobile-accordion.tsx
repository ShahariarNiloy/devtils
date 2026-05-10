"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface AccordionProps {
  triggerLabel: React.ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Accordion({ triggerLabel, defaultOpen = false, disabled = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-bg">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-3.5 py-3",
          "border-t border-border-subtle transition-colors",
          disabled
            ? "text-text-faint cursor-default"
            : "text-text cursor-pointer hover:bg-surface-soft/50",
        )}
        aria-expanded={open}
      >
        <span className="font-medium">{triggerLabel}</span>
        {!disabled && (
          <ChevronDown
            size={18}
            aria-hidden
            className={cn("text-text-faint transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !disabled && (
          <motion.div
            key="body"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
