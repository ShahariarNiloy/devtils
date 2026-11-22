"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { JsonFormatterState } from "../use-json-formatter";
import { useHandoff } from "../hooks/use-handoff";

const TARGETS: { slug: string; glyph: string; label: string }[] = [
  { slug: "json-to-typescript", glyph: "TS", label: "TypeScript" },
  { slug: "json-to-zod", glyph: "Z", label: "Zod" },
  { slug: "json-to-go", glyph: "Go", label: "Go" },
  { slug: "json-to-python", glyph: "Py", label: "Python" },
  { slug: "json-to-rust", glyph: "Rs", label: "Rust" },
  { slug: "json-to-yaml", glyph: "Y", label: "YAML" },
  { slug: "json-to-xml", glyph: "<>", label: "XML" },
  { slug: "json-to-csv", glyph: "C", label: "CSV" },
  { slug: "json-schema", glyph: "§", label: "JSON Schema" },
];

/**
 * "Convert to" strip under the workspace. Each chip opens the dedicated
 * converter with the current input handed off, so nothing is re-pasted.
 */
export function ConvertStrip({ state }: { state: JsonFormatterState }) {
  const handoff = useHandoff(state);
  // Small inputs stash synchronously and the link navigates as usual; a
  // large one is formatted off the main thread first, then navigates.
  const stash = (e: MouseEvent, slug: string) => {
    if (state.validation.status !== "valid") return;
    if (handoff.stashNow()) return;
    e.preventDefault();
    handoff.open(slug);
  };
  return (
    <section id="convert" data-full-window-hide aria-label="Convert" className="surface-panel flex flex-wrap items-center gap-2 rounded-[14px] px-3.5 py-3">
      <span className="mr-0.5 basis-full text-[13px] text-text-faint sm:basis-auto">Convert to</span>
      {TARGETS.map((t) => (
        <Link
          key={t.slug}
          href={`/tools/${t.slug}`}
          onClick={(e) => stash(e, t.slug)}
          aria-busy={handoff.pendingSlug === t.slug || undefined}
          className="surface-key inline-flex min-h-[34px] shrink-0 items-center gap-[7px] rounded-[9px] px-[11px] text-[13px] font-semibold text-[#ece7dc] transition-colors hover:border-clay-light/60 hover:text-[#ece7dc]"
        >
          <span aria-hidden="true" className="font-mono text-[10px] text-clay-light">{t.glyph}</span>
          <span className={handoff.busySlug === t.slug ? "animate-pulse" : undefined}>{t.label}</span>
        </Link>
      ))}
    </section>
  );
}
