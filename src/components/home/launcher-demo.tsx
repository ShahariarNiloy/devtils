import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { Keycap } from "@/components/layout/brand/brand-mark";
import type { ShowcaseTool, Tint } from "./landing-data";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";
import { DOCK_BTN, DOCK_LABEL, DOCK_ROW } from "./hero-dock";

const TINT_BG: Record<Tint, string> = {
  clay: "bg-cat-clay",
  teal: "bg-cat-teal",
  sage: "bg-cat-sage",
  rose: "bg-cat-rose",
};
const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

/**
 * The hero's "Command palette" tab: a working mini command palette over the
 * showcase tools, plus a dock. Arrow keys move the selection, Enter opens
 * the tool. Rendered inside the product window of `HeroDemo`.
 */
export function LauncherPalette({
  tools,
  catalogueCount,
}: {
  tools: readonly ShowcaseTool[];
  catalogueCount: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);

  const q = query.toLowerCase().trim();
  const matches = tools
    .map((t, i) => ({ t, i }))
    .filter(
      ({ t }) => !q || `${t.name} ${t.cat} ${t.desc}`.toLowerCase().includes(q),
    );
  const selected = matches.some((m) => m.i === sel)
    ? sel
    : (matches[0]?.i ?? sel);
  const cur = tools[selected];

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!matches.length) return;
    const pos = matches.findIndex((m) => m.i === selected);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel(matches[(pos + 1) % matches.length].i);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel(matches[(pos - 1 + matches.length) % matches.length].i);
    } else if (e.key === "Enter") {
      e.preventDefault();
      router.push(`/tools/${cur.slug}`);
    }
  };

  return (
    <>
      {/* palette */}
      <div className="w-full max-w-[760px] overflow-hidden rounded-[14px] bg-[rgba(28,28,26,.94)] text-left shadow-search">
        <div className="flex items-center gap-3 border-b border-border-subtle px-[18px] py-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-faint)"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <label htmlFor="launcher-q" className="sr-only">
            Search tools
          </label>
          <input
            id="launcher-q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Search ${catalogueCount} tools…`}
            autoComplete="off"
            className="min-h-7 min-w-0 grow border-0 bg-transparent text-lg text-text outline-none placeholder:text-placeholder"
          />
          <span className="hidden shrink-0 rounded-md border border-border px-2 py-[3px] font-mono text-[11px] whitespace-nowrap text-text-faint sm:inline">
            All categories
          </span>
        </div>
        <div className="flex min-h-[300px] flex-wrap">
          <div className="flex-[1_1_280px] border-r border-border-subtle p-2">
            <div className="px-2.5 pt-2 pb-1.5 text-xs text-text-faint">
              Tools
            </div>
            {matches.map(({ t, i }) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setSel(i)}
                onDoubleClick={() => router.push(`/tools/${t.slug}`)}
                aria-pressed={i === selected}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left text-sm text-text hover:bg-white/[.04]",
                  i === selected && "bg-white/[.07] hover:bg-white/[.07]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-[26px] items-center justify-center rounded-[7px] font-mono text-[10px] font-medium text-charcoal",
                    TINT_BG[t.tint],
                  )}
                >
                  <KeyIcon icon={toolIcon(t.slug)} box={26} />
                </span>
                <span className="grow">{t.name}</span>
                <span className="text-xs text-text-faint">{t.cat}</span>
              </button>
            ))}
            {matches.length === 0 && (
              <p className="m-0 px-2.5 py-6 text-sm text-text-faint">
                No match. Try “json” or “color”.
              </p>
            )}
          </div>
          <div className="flex flex-[1_1_280px] flex-col gap-3.5 p-[18px]">
            <pre className="m-0 min-h-[132px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface p-3.5 font-mono text-[12.5px] leading-[1.65] whitespace-pre text-syntax-plain">
              {cur.sample}
            </pre>
            <div className="text-xs text-text-faint">Information</div>
            <dl className="m-0 flex flex-col text-[13px]">
              <div className="flex justify-between border-b border-white/[.05] py-1.5">
                <dt className="text-text-faint">Tool</dt>
                <dd className="m-0">{cur.name}</dd>
              </div>
              <div className="flex justify-between border-b border-white/[.05] py-1.5">
                <dt className="text-text-faint">Does</dt>
                <dd className="m-0">{cur.desc}</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-text-faint">Network</dt>
                <dd className="m-0 text-success">0 requests</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 border-t border-border-subtle bg-[rgba(20,20,19,.9)] py-[9px] pr-2.5 pl-3.5">
          <span className="inline-flex items-center gap-2 text-[13px] text-text-muted">
            <span
              aria-hidden="true"
              className={cn("size-4 rounded-[4px]", TINT_BG[cur.tint])}
            />
            {cur.name}
          </span>
          <span className="grow" />
          <Link
            href={`/tools/${cur.slug}`}
            className="inline-flex items-center gap-1.5 text-[13px] text-text"
          >
            Open tool{" "}
            <Keycap className="h-5 min-w-5 rounded-[5px] text-[11px] text-text">
              ↵
            </Keycap>
          </Link>
          <span aria-hidden="true" className="h-4 w-px bg-white/10" />
          <span className="inline-flex items-center gap-1.5 text-[13px] text-text-muted">
            Actions{" "}
            <Keycap className="h-5 min-w-5 rounded-[5px] text-[11px] text-text">
              ⌘
            </Keycap>
            <Keycap className="h-5 min-w-5 rounded-[5px] text-[11px] text-text">
              K
            </Keycap>
          </span>
        </div>
      </div>

      {/* dock */}
      <div className="flex flex-col items-center gap-2.5">
        <span className={DOCK_LABEL}>{cur.name}</span>
        <div className={DOCK_ROW}>
          {tools.map((t, i) => (
            <button
              key={t.slug}
              type="button"
              aria-label={t.name}
              aria-pressed={i === selected}
              onClick={() => {
                setSel(i);
                setQuery("");
              }}
              className={cn(
                DOCK_BTN,
                i === selected
                  ? cn(
                      TINT_TEXT[t.tint],
                      "outline-1! outline-offset-2! outline-solid! outline-clay-light/55!",
                    )
                  : "text-text-faint",
              )}
            >
              <KeyIcon icon={toolIcon(t.slug)} box={38} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
