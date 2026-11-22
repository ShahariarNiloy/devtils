"use client";
/* eslint-disable react/no-array-index-key -- code lines and their spans are positional. */

import { memo, useMemo } from "react";
import { cn } from "@/lib/cn";
import { highlight, type Tone } from "../curl-highlight.lib";
import type { Lang } from "../curl-generate.lib";

const TONE: Record<Tone, string> = {
  plain: "text-syntax-plain",
  comment: "text-syntax-comment",
  string: "text-syntax-string",
  number: "text-syntax-number",
  key: "text-syntax-key",
  keyword: "text-syntax-boolean",
  flag: "text-syntax-key",
};

/** Highlighted, line-numbered, read-only code. */
export const CodeView = memo(function CodeView({
  code,
  lang,
  className,
}: {
  code: string;
  lang: Lang;
  className?: string;
}) {
  const lines = useMemo(() => highlight(code, lang), [code, lang]);
  const gutter = useMemo(() => lines.map((_, i) => i + 1).join("\n"), [lines]);
  return (
    <div
      role="region"
      aria-label="Generated code"
      tabIndex={0}
      className={cn(
        "overflow-auto bg-[#0d0d0c] py-3 font-mono text-[12.5px] leading-[1.7] [font-variant-ligatures:none] [tab-size:4]",
        className,
      )}
    >
      <div className="flex min-w-max">
        <pre
          aria-hidden="true"
          className="m-0 w-[42px] shrink-0 pr-3.5 text-right text-[#4d4c47] select-none"
        >
          {gutter}
        </pre>
        <pre className="m-0 pr-4">
          <code>
            {lines.map((spans, i) => (
              <span key={i}>
                {spans.map((s, j) => (
                  <span key={j} className={TONE[s.tone]}>
                    {s.t}
                  </span>
                ))}
                {i < lines.length - 1 ? "\n" : null}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
});
