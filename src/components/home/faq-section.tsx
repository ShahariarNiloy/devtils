import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { LIVE_TOOL_COUNT } from "@/lib/implemented-tools";
import { Band } from "./band";

/**
 * Exported so the homepage JSON-LD emitter can produce a matching
 * `FAQPage` schema from the same source the visible FAQ is rendered from
 * — there's only one set of FAQ copy, and both renderers consume it.
 */
export const HOMEPAGE_FAQ: { q: string; a: string }[] = [
  {
    q: "Is my data private?",
    a: "Yes. Every tool runs entirely in your browser. Nothing you paste, type, or upload is sent to a server — there is no server processing your content.",
  },
  {
    q: "Is it really free?",
    a: `Yes. All ${LIVE_TOOL_COUNT} tools currently shipped are $0 — no trials, no credit card, no usage caps. Future heavier tools may sit behind a paid tier, but anything live today is open to use.`,
  },
  {
    q: "Do I need an account?",
    a: "No. There is no sign-up, no email wall, and no login. Open a tool and use it immediately.",
  },
  {
    q: "Does it work offline?",
    a: "Once a tool's page has loaded it runs locally, so most tools keep working without a connection. Some heavier tools download a one-time module on first use.",
  },
  {
    q: "Can I use it for sensitive data?",
    a: "Because processing is client-side and nothing is transmitted, these tools are well-suited to data you would not want to paste into a hosted service. Always follow your own organisation's policy.",
  },
];

/** Static, zero-JS FAQ — editorial two-column: sticky intro left, list right. */
export function FaqSection() {
  return (
    <Band id="faq" tone="soft" aria-label="Frequently asked questions" className="pt-16 pb-20">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Left — sticky intro */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <span className="inline-flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-eyebrow text-text-faint">
            <span
              className="h-3.5 w-[3px] rounded-full"
              style={{ background: "var(--color-sage-olive)" }}
              aria-hidden
            />
            <span className="text-clay">05</span>
            <span aria-hidden className="text-text-faint/40">
              /
            </span>
            FAQ
          </span>
          <h2 className="display mt-3.5 text-balance text-page font-semibold tracking-tight text-text sm:text-4xl">
            Questions,
            <br className="hidden sm:block" /> answered
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-desc text-text-faint">
            The short version: it&apos;s private, free, and yours to use. Still
            curious? The fastest answer is to open a tool and watch your network
            tab.
          </p>
          <Link
            href="/tools"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted transition-colors hover:text-text"
          >
            Browse all tools
            <ArrowUpRight
              size={14}
              aria-hidden
              className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {/* Right — disclosure list */}
        <div className="flex flex-col gap-2.5">
          {HOMEPAGE_FAQ.map(({ q, a }, i) => (
            <details
              key={q}
              className="group rounded-xl border border-border bg-surface transition-colors duration-150 open:border-border-strong hover:border-border-strong [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
                <span className="shrink-0 font-mono text-xs tabular-nums text-text-faint/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[15px] font-semibold text-text">
                  {q}
                </span>
                <span
                  aria-hidden
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-text-faint transition-all duration-200 ease-out-strong group-open:rotate-45 group-open:border-clay group-open:text-clay"
                >
                  <Plus size={14} strokeWidth={2} />
                </span>
              </summary>
              <p className="pb-4 pl-[3.25rem] pr-5 text-sm leading-snug-2 text-text-muted">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Band>
  );
}
