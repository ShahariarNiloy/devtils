"use client";

import { Fragment, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FilterItem {
  key: string;
  tag: string;
  /** Server-rendered card. */
  node: ReactNode;
}

/**
 * /blog tag chips + card grid. The only client code on the index: cards
 * arrive pre-rendered from the server, this island just picks which show.
 */
export function PostFilter({ tags, items }: { tags: string[]; items: FilterItem[] }) {
  const [tag, setTag] = useState("All");
  const shown = tag === "All" ? items : items.filter((i) => i.tag === tag);

  return (
    <>
      <div role="group" aria-label="Filter posts" className="mb-[18px] flex flex-wrap gap-1.5">
        {["All", ...tags].map((t) => {
          const on = t === tag;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => setTag(t)}
              className={cn(
                "min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                on ? "border-brand bg-brand text-on-brand" : "border-white/[.12] text-text-tertiary hover:text-text",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {shown.length} {shown.length === 1 ? "post" : "posts"} shown
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3.5">
        {shown.map((i) => (
          <Fragment key={i.key}>{i.node}</Fragment>
        ))}
      </div>
    </>
  );
}
