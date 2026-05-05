"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/primitives/Dialog";
import { Kbd } from "@/components/primitives/Kbd";
import { CATEGORIES, TOOLS } from "@/lib/tools-registry";
import { useShortcut, isMac } from "@/lib/keyboard";
import { cn } from "@/lib/cn";

const RECENT_KEY = "devtoolbox:recent";
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

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-xs-plus text-text-faint">
              No matching tools.
            </Command.Empty>

            {recentTools.length > 0 && !query && (
              <Command.Group
                heading="Recent"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-faint"
              >
                {recentTools.map((t) => (
                  <PaletteItem key={t.slug} value={`${t.name} ${t.tags.join(" ")}`} onSelect={() => onSelect(t.slug)}>
                    <span className="text-text">{t.name}</span>
                    <span className="ml-auto text-2xs text-text-faint uppercase tracking-wider">
                      {t.category}
                    </span>
                  </PaletteItem>
                ))}
              </Command.Group>
            )}

            {CATEGORIES.map((cat) => {
              const inCat = TOOLS.filter((t) => t.category === cat);
              if (inCat.length === 0) return null;
              return (
                <Command.Group
                  key={cat}
                  heading={cat}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-faint mt-1"
                >
                  {inCat.map((t) => (
                    <PaletteItem
                      key={t.slug}
                      value={`${t.name} ${t.description} ${t.tags.join(" ")} ${t.category}`}
                      onSelect={() => onSelect(t.slug)}
                    >
                      <span className="text-text">{t.name}</span>
                      <span className="text-xs text-text-faint truncate">
                        {t.description}
                      </span>
                    </PaletteItem>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          <div className="border-t border-border-subtle px-3 h-8 flex items-center gap-3 text-2xs text-text-faint">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="ml-auto">DevToolbox</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function PaletteItem({
  value,
  onSelect,
  children,
}: {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-xs-plus text-text-muted",
        "data-[selected=true]:bg-surface-3 data-[selected=true]:text-text",
      )}
    >
      {children}
    </Command.Item>
  );
}

const OPEN_EVENT = "devtoolbox:open-palette";

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
