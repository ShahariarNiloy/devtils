import { Command, ShieldCheck, WifiOff, Zap, type LucideIcon } from "lucide-react";
import { Band } from "./band";
import { SectionHeading } from "./section-heading";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Everything runs in your browser. There's no server to send your data to in the first place.",
  },
  {
    icon: Zap,
    title: "Instant",
    body: "No uploads, no queues. Every tool runs at native speed the moment the page loads.",
  },
  {
    icon: Command,
    title: "Keyboard-first",
    body: "⌘K reaches any tool. Built for hands that would rather stay on the keyboard.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "Once a tool has loaded it keeps working — no connection required.",
  },
];

/** "Why it's different" — the four differentiators. Sells the value where the
 *  page used to list tools a third time. */
export function DifferenceSection() {
  return (
    <Band aria-label="What makes devtils different" className="pt-16 pb-20">
      <SectionHeading
        index="04"
        eyebrow="The difference"
        title="The non-negotiables."
        hint="No servers in the loop — just fast, private tools that respect your data and your keyboard."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 transition-all duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card"
          >
            {/* Faint chapter numeral — editorial motif, warms to clay on hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-1 -top-2 select-none font-mono text-6xl font-bold leading-none tabular-nums text-text-faint/10 transition-colors duration-200 group-hover:text-clay/20"
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: "var(--color-mist-sage)",
                color: "var(--color-olive-ink)",
              }}
              aria-hidden
            >
              <f.icon size={18} />
            </span>

            <h3 className="relative mt-4 text-base font-semibold tracking-tight text-text">
              {f.title}
            </h3>
            <p className="relative mt-1.5 text-sm leading-snug-2 text-text-faint">
              {f.body}
            </p>

            {/* Clay underline wipes in on hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 ease-out-strong group-hover:scale-x-100"
              style={{ background: "var(--color-clay)" }}
            />
          </div>
        ))}
      </div>
    </Band>
  );
}
