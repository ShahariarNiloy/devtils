"use client";

import { useMemo } from "react";

const SEGMENTS = [
  { name: "header", tone: "text-[#f2a0b9]" },
  { name: "payload", tone: "text-[#c3b3ff]" },
  { name: "signature", tone: "text-[#86dbe8]" },
] as const;

/**
 * Colour-coded token editor (mockup): a <pre> in normal flow paints the
 * segments and sets the height; a transparent textarea sits on top for
 * input. The pane grows with the token, so nothing scrolls internally.
 */
export function TokenEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = useMemo(() => value.split("."), [value]);
  const threeParts = parts.length === 3;
  const metrics =
    "m-0 p-4 font-mono text-[12.5px] leading-[1.8] whitespace-pre-wrap break-all sm:text-[13px]";

  return (
    <div className="relative min-h-[200px]">
      <pre aria-hidden="true" className={`${metrics} min-h-[200px] text-syntax-plain`}>
        {threeParts
          ? SEGMENTS.map((s, i) => (
              <span key={s.name}>
                {i > 0 && <span className="text-text-faint">.</span>}
                <span className={s.tone}>{parts[i]}</span>
              </span>
            ))
          : value}
        {/* Keeps a trailing newline's height in the mirror. */}
        {"​"}
      </pre>
      <label htmlFor="jwt-in" className="sr-only">
        Encoded token
      </label>
      <textarea
        id="jwt-in"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        placeholder="Paste a JWT (header.payload.signature)"
        className={`${metrics} absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent text-transparent caret-text outline-none placeholder:text-placeholder selection:bg-clay-light/30 selection:text-transparent`}
      />
    </div>
  );
}
