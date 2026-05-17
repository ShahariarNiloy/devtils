import { ChevronDown } from "lucide-react";
import { TOOL_COUNT } from "@/lib/tools-registry";
import { Band } from "./band";
import { SectionHeading } from "./section-heading";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is my data private?",
    a: "Yes. Every tool runs entirely in your browser. Nothing you paste, type, or upload is sent to a server — there is no server processing your content.",
  },
  {
    q: "Is it really free?",
    a: `Yes. All ${TOOL_COUNT} tools are $0 with no account and no usage caps. Pro and AI tools are also unlocked at $0 while we're in beta.`,
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

/** Static, zero-JS FAQ using native <details> disclosures. */
export function FaqSection() {
  return (
    <Band tone="soft" aria-label="Frequently asked questions" className="pt-14 pb-16">
      <SectionHeading
        eyebrow="FAQ"
        title="Questions, answered"
        hint="The short version: it's private, free, and yours to use."
      />
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
        {FAQ.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-xl border border-border bg-surface px-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-text">
              {q}
              <ChevronDown
                size={16}
                aria-hidden
                className="shrink-0 text-text-faint transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="pb-4 text-sm leading-snug-2 text-text-muted">{a}</p>
          </details>
        ))}
      </div>
    </Band>
  );
}
