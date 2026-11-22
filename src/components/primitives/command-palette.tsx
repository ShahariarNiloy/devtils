"use client";

import { Keyboard, LayoutGrid, Plus, Search, Sparkles, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/primitives/dialog";
import { openShortcutsSheet } from "@/components/shared/shortcuts-overlay";
import { cn } from "@/lib/cn";
import { isMac, useShortcut } from "@/lib/keyboard";
import { SHOWCASE_TOOLS, type Tool } from "@/lib/tools-registry";
import { LIVE_SLUGS } from "@/lib/tools/live";
import { CATEGORY_TINT, TOOL_PRESENTATION, type Tint } from "@/lib/tools/presentation";
import { useIsMobile } from "@/lib/use-is-mobile";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";
import { EmptySearch } from "@/components/illustrations/empty-search";

const RECENT_KEY = "utilyx:recent";
const MAX_RECENT = 3;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Push a tool slug to the recents list (most-recent first, de-duped, capped). */
export function pushRecent(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const cur = readRecent().filter((s) => s !== slug);
    cur.unshift(slug);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 8)));
  } catch {
    /* storage unavailable — recents are a convenience */
  }
}

const LIVE = new Set(LIVE_SLUGS);
const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

type Scope = "all" | "live" | "json" | "seo";
const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "json", label: "JSON" },
  { id: "seo", label: "SEO" },
];

interface Item {
  id: string;
  name: string;
  icon: LucideIcon;
  tint: string;
  desc: string;
  meta: string;
  soon: boolean;
  run: () => void;
}

/** Case-insensitive rank: prefix > substring (earlier is better) > subsequence. */
function score(text: string, q: string): number {
  if (!q) return 1;
  const n = text.toLowerCase();
  const i = n.indexOf(q);
  if (i === 0) return 100;
  if (i > 0) return 80 - Math.min(i, 60);
  let j = 0;
  for (let k = 0; k < n.length && j < q.length; k++) if (n[k] === q[j]) j++;
  return j === q.length ? 10 : 0;
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-clay-light">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * v2 ⌘K palette: search every catalogue tool, scope chips, recents, and
 * actions (type ">" for actions only). Full-screen sheet on phones.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [sel, setSel] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const onOpenChangeAndReset = (next: boolean) => {
    if (next) setRecent(readRecent());
    else {
      setQuery("");
      setScope("all");
      setSel(0);
    }
    onOpenChange(next);
  };
  // Opened from outside (⌘K / event): load recents once per open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRecent(readRecent());
  }

  const go = (href: string, slug?: string) => {
    if (slug) pushRecent(slug);
    onOpenChangeAndReset(false);
    router.push(href);
  };

  const raw = query.trim().toLowerCase();
  const actionMode = raw.startsWith(">");
  const q = actionMode ? raw.slice(1).trim() : raw;

  const groups = useMemo(() => {
    const toolItem = (t: Tool): Item => {
      const p = TOOL_PRESENTATION[t.slug];
      return {
        id: `tool-${t.slug}`,
        name: p?.label ?? t.name,
        icon: toolIcon(t.slug),
        tint: TINT_TEXT[p?.tint ?? CATEGORY_TINT[t.category]],
        desc: p?.desc ?? t.description,
        meta: t.category,
        soon: !LIVE.has(t.slug),
        run: () => go(`/tools/${t.slug}`, t.slug),
      };
    };
    const actions: Item[] = [
      { id: "act-shortcuts", name: "Keyboard shortcuts", icon: Keyboard, tint: "text-text-muted", desc: "", meta: "?", soon: false, run: () => { onOpenChangeAndReset(false); openShortcutsSheet(); } },
      { id: "act-request", name: "Request a tool", icon: Plus, tint: "text-text-muted", desc: "", meta: "", soon: false, run: () => go("/request") },
      { id: "act-new", name: "What's new", icon: Sparkles, tint: "text-text-muted", desc: "", meta: "", soon: false, run: () => go("/changelog") },
      { id: "act-all", name: "Browse all tools", icon: LayoutGrid, tint: "text-text-muted", desc: "", meta: "", soon: false, run: () => go("/tools") },
    ];

    const out: { title: string; items: Item[] }[] = [];
    if (!actionMode) {
      if (!q && scope === "all") {
        const rec = recent
          .map((s) => SHOWCASE_TOOLS.find((t) => t.slug === s))
          .filter((t): t is Tool => Boolean(t))
          .slice(0, MAX_RECENT)
          .map(toolItem);
        if (rec.length) out.push({ title: "Recent", items: rec });
      }
      const inScope = SHOWCASE_TOOLS.filter((t) => {
        if (scope === "live") return LIVE.has(t.slug);
        if (scope === "json") return t.category === "JSON";
        if (scope === "seo") return t.category === "SEO";
        return true;
      });
      const ranked = inScope
        .map((t) => {
          const p = TOOL_PRESENTATION[t.slug];
          const s = Math.max(score(`${p?.label ?? t.name} ${t.category}`, q), score(t.name, q), q ? score(t.tags.join(" "), q) / 2 : 0);
          return { t, s };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s);
      if (ranked.length) out.push({ title: q ? "Tools" : scope === "all" ? "All tools" : "Tools", items: ranked.map((x) => toolItem(x.t)) });
    }
    const acts = actionMode || !q ? actions : actions.filter((a) => score(a.name, q) > 0);
    if (actionMode || (q && acts.length) || (!q && scope === "all")) {
      out.push({ title: "Actions", items: actionMode ? acts : acts.slice(0, 3) });
    }
    return out;
    // go / onOpenChangeAndReset are stable enough for a render-time list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, actionMode, scope, recent]);

  const flat = groups.flatMap((g) => g.items);
  const active = Math.min(sel, Math.max(0, flat.length - 1));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel(Math.min(flat.length - 1, active + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel(Math.max(0, active - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[active]?.run();
    }
  };

  let index = 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAndReset}>
      <DialogContent
        hideClose
        aria-describedby={undefined}
        className={cn(
          "flex flex-col overflow-hidden p-0 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_0_0_1px_rgba(255,255,255,.09),0_0_90px_-20px_rgba(197,142,94,.35),0_40px_80px_-30px_rgba(0,0,0,.9)]",
          isMobile
            ? "top-0 h-dvh max-h-dvh w-full max-w-none rounded-none"
            : "top-[110px] max-h-[min(620px,calc(100dvh-140px))] w-[min(680px,calc(100vw-96px))] rounded-2xl",
        )}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-3 border-b border-white/[.07] px-[18px] py-4">
          <Search size={20} strokeWidth={2} className="shrink-0 text-text-faint" aria-hidden />
          <label htmlFor="pal-q" className="sr-only">Search tools and actions</label>
          <input
            id="pal-q"
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-list"
            aria-activedescendant={flat[active]?.id}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
            autoComplete="off"
            spellCheck={false}
            placeholder={`Search ${SHOWCASE_TOOLS.length} tools, or type > for actions`}
            className="min-h-[30px] min-w-0 grow border-0 bg-transparent text-lg text-text outline-none placeholder:text-placeholder"
          />
          {isMobile ? (
            <button type="button" onClick={() => onOpenChangeAndReset(false)} className="min-h-10 px-2.5 text-[15px] font-semibold text-clay-light">
              Cancel
            </button>
          ) : (
            <kbd className="surface-key inline-flex h-6 items-center rounded-[6px] px-[7px] font-mono text-[11px] text-text-tertiary">esc</kbd>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
          {SCOPES.map((s) => {
            const on = s.id === scope;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setScope(s.id);
                  setSel(0);
                }}
                className={cn(
                  "min-h-8 rounded-full border px-[11px] text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-light",
                  on ? "border-clay-light/50 bg-clay-light/14 text-clay-cream" : "border-white/10 text-text-tertiary hover:text-text",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div ref={listRef} id="pal-list" role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto px-2 pt-1.5 pb-2">
          {groups.map((g) => (
            <div key={g.title} role="group" aria-label={g.title}>
              <div className="px-2.5 pt-2.5 pb-1.5 text-xs text-text-faint">{g.title}</div>
              {g.items.map((it) => {
                const i = index++;
                const on = i === active;
                return (
                  <div
                    key={`${g.title}-${it.id}`}
                    id={it.id}
                    data-index={i}
                    role="option"
                    aria-selected={on}
                    tabIndex={-1}
                    onMouseEnter={() => setSel(i)}
                    onClick={it.run}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-1.5",
                      isMobile ? "min-h-14" : "min-h-12",
                      on ? "bg-clay-light/10 shadow-[inset_0_0_0_1px_rgba(224,160,114,.35)]" : "hover:bg-white/5",
                    )}
                  >
                    <span aria-hidden="true" className={cn("surface-key flex size-[30px] shrink-0 items-center justify-center rounded-lg font-mono text-[10px]", it.tint)}>
                      <KeyIcon icon={it.icon} box={28} />
                    </span>
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate text-sm font-semibold text-text">
                        <Highlight text={it.name} q={q} />
                      </span>
                      {it.desc && <span className="truncate text-xs text-text-faint">{it.desc}</span>}
                    </span>
                    {it.soon && <span className="rounded-md border border-white/10 px-[7px] py-0.5 text-[11px] text-text-tertiary">soon</span>}
                    {it.meta && <span className="text-xs text-text-faint">{it.meta}</span>}
                    {on && !isMobile && (
                      <kbd className="surface-key inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[5px] font-mono text-[11px] text-text">↵</kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {flat.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 pt-6 pb-8 text-center">
              <EmptySearch className="mb-1.5 w-[150px]" />
              <span className="text-[15px] font-bold">No tool called “{query.trim()}” yet</span>
              <button type="button" onClick={() => go("/request")} className="text-sm text-clay-light hover:text-clay-cream">
                Request it →
              </button>
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-white/[.07] bg-[rgba(18,18,17,.9)] px-4 py-2.5 text-xs text-text-faint">
            <span className="inline-flex items-center gap-1.5"><FootKey>↑</FootKey><FootKey>↓</FootKey>navigate</span>
            <span className="inline-flex items-center gap-1.5"><FootKey>↵</FootKey>open</span>
            <span className="inline-flex items-center gap-1.5"><FootKey wide>&gt;</FootKey>actions</span>
            <span className="grow" />
            <button
              type="button"
              onClick={() => {
                onOpenChangeAndReset(false);
                openShortcutsSheet();
              }}
              className="inline-flex items-center gap-1.5 text-text-muted hover:text-text"
            >
              <FootKey>?</FootKey>All shortcuts
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FootKey({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <kbd className={cn("surface-key inline-flex h-5 items-center justify-center rounded-[5px] font-mono text-[10px] text-text-key", wide ? "px-[5px]" : "min-w-5")}>
      {children}
    </kbd>
  );
}

const OPEN_EVENT = "utilyx:open-palette";

/** Trigger the global palette from anywhere on the page. */
export function openCommandPalette() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Palette state + the global ⌘K toggle. ("/" is left to tools, which use it
 * to focus their own input.) Listens for OPEN_EVENT so any button can open it.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useShortcut({ key: "k", meta: true, label: "Open command palette", group: "Anywhere" }, (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  });
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);
  return { open, setOpen, hint: isMac() ? "⌘ K" : "Ctrl K" };
}
