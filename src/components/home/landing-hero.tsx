import Link from "next/link";
import { HeroKeyfield } from "./hero-keyfield";
import { PRIVACY_PROMISE } from "@/lib/site";
import { LIVE_COUNT } from "./landing-data";

export function LandingHero() {
  return (
    // Extra bottom room on narrow screens so a strip of the keyboard floor
    // (and its wandering clay key) shows below the buttons.
    <section className="relative flex flex-col items-center px-6 pt-[110px] pb-[112px] text-center lg:pb-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 left-1/2 h-[520px] w-[900px] max-w-[120%] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(197,142,94,.30),rgba(197,142,94,.08)_55%,rgba(197,142,94,0))] opacity-[.85]" />
        <HeroKeyfield />
        {/* Readability: a soft dark pool under the lede and buttons so the
            keycaps that reach up behind them never compete with the text. */}
        <div className="absolute top-[300px] left-1/2 h-[300px] w-[760px] max-w-full -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(11,11,10,.62),rgba(11,11,10,0))]" />
      </div>

      <Link
        href="/#changelog"
        className="relative mb-8 inline-flex items-center gap-2 rounded-full border border-clay-light/40 bg-[rgba(26,20,14,.7)] px-3.5 py-1.5 text-[13px] text-clay-cream hover:text-clay-cream"
      >
        {LIVE_COUNT} tools live · {PRIVACY_PROMISE.toLowerCase()}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
      <h1 className="relative m-0 max-w-[900px] font-sans text-[clamp(36px,6.4vw,80px)] leading-[1.02] text-balance font-bold tracking-[-0.045em] text-text">
        Every tool you need.
        <br />
        None you don&apos;t.
      </h1>
      <p className="relative mt-6 max-w-[540px] text-[17px] leading-[1.55] text-pretty text-text-muted sm:text-[19px]">
        Merge PDFs, compress images, format JSON, decode tokens — {LIVE_COUNT}{" "}
        tools that work right here in the page. Your files and pastes are never
        sent anywhere.
      </p>
      <div className="relative mt-9 flex flex-wrap justify-center gap-3">
        <Link
          href="/tools"
          className="btn-action inline-flex min-h-[46px] items-center gap-2.5 rounded-[11px] px-5 text-[15px] font-semibold shadow-btn-primary"
        >
          Browse all tools
          <kbd className="rounded-[5px] bg-[rgba(26,26,24,.1)] px-1.5 py-px font-mono text-xs text-[#3d4435]">
            ↵
          </kbd>
        </Link>
        <Link
          href="/tools/json-formatter"
          className="inline-flex min-h-[46px] items-center rounded-[11px] border border-border-strong bg-white/[.03] px-5 text-[15px] font-medium text-text hover:text-white"
        >
          Try JSON Formatter
        </Link>
      </div>
      <p className="relative mt-[18px] font-mono text-xs text-text-faint">
        No sign-up · No uploads · No watermarks
      </p>
    </section>
  );
}
