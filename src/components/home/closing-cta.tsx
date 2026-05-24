import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { TOOL_COUNT } from "@/lib/tools-registry";
import { Band } from "./band";

/** Tail CTA — gives the long scroll a strong, on-brand close before the footer. */
export function ClosingCta() {
  return (
    <Band aria-label="Get started" className="py-16">
      <div
        className="relative overflow-hidden rounded-2xl border border-border px-8 py-14 text-center sm:px-12 sm:py-20"
        style={{
          background:
            "linear-gradient(135deg, var(--color-olive-ink) 0%, var(--color-sage-olive) 100%)",
        }}
      >
        {/* Faint technical grid — texture, not glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-bone-cream) 1px, transparent 1px), linear-gradient(90deg, var(--color-bone-cream) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(120% 120% at 50% 40%, #000 35%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(120% 120% at 50% 40%, #000 35%, transparent 78%)",
          }}
        />

        <div className="relative mx-auto max-w-2xl">
          <span
            className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-eyebrow"
            style={{ color: "color-mix(in oklab, var(--color-mist-sage) 85%, transparent)" }}
          >
            <span
              className="h-3.5 w-[3px] rounded-full"
              style={{ background: "var(--color-clay)" }}
              aria-hidden
            />
            Get started
          </span>
          <h2
            className="display mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ color: "var(--color-bone-cream)" }}
          >
            Pick a tool. Get to work.
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-pretty text-base leading-desc"
            style={{ color: "var(--color-mist-sage)" }}
          >
            {TOOL_COUNT} handcrafted developer utilities — free, private, and
            running entirely in your browser.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tools"
              className="group inline-flex h-btn-lg items-center gap-2 rounded-button px-6 text-sm font-semibold transition-all duration-150 ease-out-strong hover:-translate-y-px"
              style={{
                background: "var(--color-bone-cream)",
                color: "var(--color-olive-ink)",
              }}
            >
              Browse all tools
              <ArrowRight
                size={15}
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/tools/json-formatter"
              className="inline-flex h-btn-lg items-center gap-2 rounded-button border px-6 text-sm font-semibold transition-all duration-150 ease-out-strong hover:-translate-y-px"
              style={{
                borderColor:
                  "color-mix(in oklab, var(--color-mist-sage) 45%, transparent)",
                color: "var(--color-bone-cream)",
              }}
            >
              Try JSON formatter
            </Link>
          </div>
        </div>
      </div>
    </Band>
  );
}
