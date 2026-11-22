import { PasteDemo } from "./paste-demo";

/**
 * The "product window" under the hero: a browser frame around the
 * "Paste anything" demo. Server component; only `PasteDemo` is client.
 */
export function HeroDemo() {
  return (
    <div className="flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[20px] [background:radial-gradient(120%_80%_at_50%_100%,rgba(167,111,62,.22),rgba(11,11,10,0)_60%),#0f0f0e] shadow-window">
      {/* browser chrome */}
      <div className="flex items-center gap-3.5 border-b border-border-subtle px-4 py-3">
        <span aria-hidden="true" className="flex gap-[7px]">
          <span className="size-[11px] rounded-full bg-[#3a3833]" />
          <span className="size-[11px] rounded-full bg-[#3a3833]" />
          <span className="size-[11px] rounded-full bg-[#3a3833]" />
        </span>
        <span className="flex grow justify-center">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/[.04] px-3.5 py-[5px] font-mono text-xs text-text-tertiary">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            utilyx.dev
          </span>
        </span>
        <span className="font-mono text-[11px] text-success">
          ● offline-ready
        </span>
      </div>

      <div className="flex h-[780px] flex-col items-center justify-center gap-[26px] overflow-hidden px-3 py-5 sm:h-[580px] sm:px-10 sm:pt-9 sm:pb-8">
        <PasteDemo />
      </div>
    </div>
  );
}
