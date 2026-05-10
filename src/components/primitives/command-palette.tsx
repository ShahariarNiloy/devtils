"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from '@/components/primitives/dialog';
import { Kbd } from '@/components/primitives/kbd';
import { TOOLS } from "@/lib/tools-registry";
import { useShortcut, isMac } from "@/lib/keyboard";
import { CommandPaletteResults } from "@/components/primitives/command-palette-results";

const RECENT_KEY = "devtils:recent";
const MAX_RECENT = 4;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Push a tool slug to the recents list. Order is most-recent-first; duplicates
 * are de-duped and the list is capped at MAX_RECENT.
 */
export function pushRecent(slug: string) {
  if (typeof window === "undefined") return;
  const cur = readRecent().filter((s) => s !== slug);
  cur.unshift(slug);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Global ⌘K palette. Lists tools grouped by category, with recents on top.
 * Built on cmdk for the fuzzy-search and keyboard nav, wrapped in our Dialog
 * so it inherits app-wide overlay/animation styling.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setRecent(readRecent());
  }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setQuery("");
  }, [open]);

  const onSelect = (slug: string) => {
    pushRecent(slug);
    onOpenChange(false);
    router.push(`/tools/${slug}`);
  };

  const recentTools = recent
    .map((slug) => TOOLS.find((t) => t.slug === slug))
    .filter((t): t is (typeof TOOLS)[number] => Boolean(t));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="top-[15%] w-[min(560px,calc(100vw-32px))] p-0 overflow-hidden"
        aria-label="Command palette"
      >
        <Command
          loop
          className="flex flex-col"
          filter={(value, search) => {
            if (!search) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <div className="flex items-center gap-2 px-4 h-12 border-b border-border-subtle">
            <Search size={14} className="text-text-faint" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search tools, tags, or categories…"
              className="flex-1 h-full bg-transparent text-sm text-text placeholder:text-text-faint outline-none border-0"
            />
            <Kbd>esc</Kbd>
          </div>

          <CommandPaletteResults
            recentTools={recentTools}
            query={query}
            onSelect={onSelect}
          />

          <div className="border-t border-border-subtle px-3 h-8 flex items-center gap-3 text-sm text-text-faint">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="ml-auto">devtils</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const OPEN_EVENT = "devtils:open-palette";

/** Trigger the global palette from anywhere on the page. */
export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

/**
 * Hook helper: returns palette state + a `meta+K` global shortcut.
 * Also listens for the `devtoolbox:open-palette` event so any consumer
 * (e.g. the hero search field) can open the palette without prop-drilling.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useShortcut(
    { key: "k", meta: true },
    (e) => {
      e.preventDefault();
      setOpen((v) => !v);
    },
  );
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);
  return { open, setOpen, hint: isMac() ? "⌘ K" : "Ctrl K" };
}
