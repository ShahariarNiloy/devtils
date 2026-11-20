"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ReleaseTag, ReleaseView } from "./changelog-model";

type Filter = "all" | ReleaseTag;

const TAG_CLASS: Record<ReleaseTag, string> = {
  New: "bg-success/16 text-success-text",
  Improved: "bg-info/16 text-info-text",
  Fixed: "bg-tier-pro-bg text-tier-pro-text",
};

const DOT_CLASS: Record<ReleaseView["dot"], string> = {
  clay: "bg-clay-light",
  sage: "bg-cat-sage",
  teal: "bg-cat-teal",
  faint: "bg-text-faint",
};

/** Renders `backtick` spans in a highlight as inline code. */
function Highlight({ text }: { text: string }) {
  const parts = text.split("`");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded-[5px] bg-surface-soft px-1 py-px font-mono text-[12.5px] text-code-clay">
            {p}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ChangelogTimeline({ releases, tags }: { releases: ReleaseView[]; tags: ReleaseTag[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? releases : releases.filter((r) => r.tag === filter);
  const options: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...tags.map((t) => ({ value: t, label: t })),
  ];

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter releases" className="flex flex-wrap gap-1">
          {options.map((o) => {
            const on = o.value === filter;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(o.value)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                  on
                    ? "border-brand bg-brand text-on-brand"
                    : "border-border-strong text-text-tertiary hover:text-text",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="sr-only">
          {shown.length} {shown.length === 1 ? "release" : "releases"} shown
        </p>
      </div>

      <ol className="m-0 ml-1.5 flex list-none flex-col border-l border-white/10 p-0">
        {shown.map((r) => (
          <li key={r.date} className="relative pb-9 pl-7">
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1.5 -left-1.5 size-[11px] rounded-full shadow-[0_0_0_4px_var(--color-bg)]",
                DOT_CLASS[r.dot],
              )}
            />
            <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <time dateTime={r.date} className="font-mono text-xs text-text-faint">
                {r.dateLabel}
              </time>
              <h2 className="m-0 basis-full text-[21px] font-bold tracking-[-0.02em]">{r.title}</h2>
            </div>
            <ul className="surface-panel m-0 list-none rounded-[14px] px-4 py-1.5">
              {r.highlights.map((h) => (
                <li
                  key={h}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-b border-white/[.05] py-2.5 last:border-b-0"
                >
                  <span
                    className={cn(
                      "flex-[0_0_76px] rounded-full px-2 py-0.5 text-center text-[11px] font-bold",
                      TAG_CLASS[r.tag],
                    )}
                  >
                    {r.tag}
                  </span>
                  <span className="flex-[1_1_260px] text-sm text-text-key">
                    <Highlight text={h} />
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}
