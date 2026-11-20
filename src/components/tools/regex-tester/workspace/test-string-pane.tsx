"use client";

import type { RegexTesterState } from "../hooks/use-regex-tester";

/**
 * Left pane (mockup): the test string, matches painted live. An invisible
 * sizer sets the height from the live text, a <pre> paints match tints
 * behind the glyphs, and the textarea on top shows the text — so typing
 * never waits on the (deferred) matcher. The pane grows with the text up
 * to a cap, then scrolls as one unit (no scroll sync).
 */
export function TestStringPane({ state }: { state: RegexTesterState }) {
  const { text, highlighted, textTooLargeToHighlight } = state;
  const metrics =
    "m-0 p-4 font-mono text-[12.5px] leading-[1.8] whitespace-pre-wrap break-words sm:text-[13px]";

  return (
    <div className="flex min-w-0 flex-[1.3_1_0%] flex-col border-b border-border-subtle md:border-r md:border-b-0">
      <div className="flex min-h-11 items-center gap-3 border-b border-border-subtle px-4 text-[13px] font-bold">
        <span id="rx-text-label">Test string</span>
        <span className="grow" />
        <span className="text-xs font-medium text-text-faint">
          {textTooLargeToHighlight ? "too large to highlight — matches still listed" : "matches highlight as you type"}
        </span>
      </div>
      <div className="max-h-[70vh] min-h-60 grow overflow-y-auto">
        <div className="relative min-h-60">
          {/* Sizer: the live text, invisible, sets the editor height. */}
          <div aria-hidden="true" className={`${metrics} invisible min-h-60`}>
            {text}
            {"\u200b"}
          </div>
          {/* Paint layer: match tints behind the glyphs (text transparent). */}
          <pre aria-hidden="true" className={`${metrics} pointer-events-none absolute inset-0 overflow-hidden text-transparent`}>
            {highlighted}
          </pre>
          <textarea
            aria-labelledby="rx-text-label"
            value={text}
            onChange={(e) => {
              state.setText(e.target.value);
              state.setSelectedMatch(null);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste or type text to test against…"
            className={`${metrics} absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent text-syntax-plain caret-text outline-none placeholder:text-placeholder selection:bg-clay-light/30`}
          />
        </div>
      </div>
    </div>
  );
}
