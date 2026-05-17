import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { TIER_COUNTS, TOOL_COUNT } from "@/lib/tools-registry";
import { Band } from "./band";
import { SectionHeading } from "./section-heading";

const FREE_PERKS = [
  `All ${TOOL_COUNT} tools, unlocked`,
  "100% client-side — nothing uploaded",
  "No account, no usage caps",
  "Keyboard-first, ⌘K everywhere",
];

const PRO_PERKS = [
  "Everything in Free",
  `${TIER_COUNTS.ai} AI-assisted tools`,
  "Heavier / batch utilities",
  "$0 while in beta",
];

/**
 * Pricing — deliberately tiny and honest: everything is $0 today. The Pro
 * column exists so the model is visible, but it's free during beta.
 */
export function PricingSection() {
  return (
    <Band aria-label="Pricing" className="pt-14 pb-16">
      <SectionHeading
        eyebrow="Pricing"
        title="Free. Actually free."
        hint="No trials, no credit card. Pro is unlocked at $0 while we're in beta."
      />

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Free — the live, current plan */}
        <div className="relative flex flex-col rounded-xl border-2 border-brand bg-surface p-6">
          <span
            className="absolute -top-2.5 left-6 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-tag"
            style={{
              background: "var(--color-brand)",
              color: "var(--color-text-on-sage)",
            }}
          >
            Current
          </span>
          <h3 className="text-sm font-bold uppercase tracking-tag text-text-faint">
            Free
          </h3>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="display text-4xl font-bold tracking-tight text-text">
              $0
            </span>
            <span className="text-sm text-text-faint">/ forever</span>
          </div>
          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {FREE_PERKS.map((p) => (
              <Perk key={p}>{p}</Perk>
            ))}
          </ul>
          <Link
            href="/tools"
            className="group mt-6 inline-flex h-btn-lg items-center justify-center gap-2 rounded-button px-5 text-sm font-semibold transition-all hover:-translate-y-px"
            style={{
              background: "var(--color-brand)",
              color: "var(--color-text-on-sage)",
              boxShadow: "0 6px 18px -10px rgba(61,68,53,0.55)",
            }}
          >
            Browse all tools
            <ArrowRight
              size={15}
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Pro — visible model, $0 during beta */}
        <div className="flex flex-col rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-tag text-text-faint">
              Pro
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-tag"
              style={{
                background: "var(--color-surface-soft)",
                color: "var(--color-text-muted)",
              }}
            >
              Beta
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="display text-4xl font-bold tracking-tight text-text">
              $0
            </span>
            <span className="text-sm text-text-faint">/ during beta</span>
          </div>
          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {PRO_PERKS.map((p) => (
              <Perk key={p}>{p}</Perk>
            ))}
          </ul>
          <Link
            href="/tools"
            className="mt-6 inline-flex h-btn-lg items-center justify-center gap-2 rounded-button border border-border bg-surface px-5 text-sm font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface-soft"
          >
            Try Pro tools free
          </Link>
        </div>
      </div>
    </Band>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-text-muted">
      <Check
        size={15}
        aria-hidden
        className="mt-0.5 shrink-0"
        style={{ color: "var(--color-brand)" }}
      />
      {children}
    </li>
  );
}
