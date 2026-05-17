import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { TOOL_COUNT } from "@/lib/tools-registry";
import { Band } from "./band";

/** Tail CTA — gives the long scroll a strong, on-brand close before the footer. */
export function ClosingCta() {
  return (
    <Band aria-label="Get started" className="py-16">
      <div
        className="relative overflow-hidden rounded-2xl border border-border px-8 py-14 text-center sm:px-12 sm:py-16"
        style={{
          background:
            "linear-gradient(135deg, var(--color-olive-ink) 0%, var(--color-sage-olive) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "var(--color-mist-sage)", opacity: 0.35 }}
        />
        <div className="relative mx-auto max-w-2xl">
          <h2
            className="display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: "var(--color-bone-cream)" }}
          >
            Everything you need, one keystroke away.
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-base leading-desc"
            style={{ color: "var(--color-mist-sage)" }}
          >
            {TOOL_COUNT} handcrafted developer utilities — free, private, and
            running entirely in your browser.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tools"
              className="group inline-flex h-btn-lg items-center gap-2 rounded-button px-6 text-sm font-semibold transition-all hover:-translate-y-px"
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
              className="inline-flex h-btn-lg items-center gap-2 rounded-button border px-6 text-sm font-semibold transition-colors"
              style={{
                borderColor: "color-mix(in oklab, var(--color-mist-sage) 45%, transparent)",
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
