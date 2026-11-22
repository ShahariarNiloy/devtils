import Link from "next/link";
import { CHANGELOG } from "@/lib/changelog";
import { cn } from "@/lib/cn";
import { Keycap } from "@/components/layout/brand/brand-mark";
import { InstallButton } from "./install-button";
import { COMING_NEXT, LANDING_FAQ, type Tint } from "./landing-data";
import { categoryIcon, KeyIcon } from "@/components/shared/key-icon";

const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

/** Two-tone section heading: bold line + muted second line. */
function SectionHead({
  title,
  sub,
  center,
}: {
  title: string;
  sub: string;
  center?: boolean;
}) {
  return (
    <div className={cn(center && "text-center")}>
      <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em]">
        {title}
      </h2>
      <p className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-text-faint">
        {sub}
      </p>
    </div>
  );
}

function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

// ── Always shipping ──────────────────────────────────────────────────────

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function ShippingSection() {
  const recent = CHANGELOG.slice(0, 3);
  return (
    <section
      id="changelog"
      className="mx-auto flex max-w-[1100px] scroll-mt-6 flex-col gap-9 px-6 pt-10 pb-[120px]"
    >
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex-[1_1_360px]">
          <SectionHead
            title="Always shipping."
            sub="New tools land quietly, every few weeks."
          />
        </div>
        <Link
          href="/changelog"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-text-muted hover:text-text"
        >
          Full changelog <Arrow />
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[18px]">
        <div className="surface-key rounded-[18px] px-[22px] py-2">
          <div className="flex items-center gap-2 pt-4 pb-1.5 text-[13px] text-text-faint">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-success"
            />
            Recently shipped
          </div>
          <ul className="m-0 list-none p-0">
            {recent.map((e, i) => (
              <li
                key={e.date + e.title}
                className={cn(
                  "flex gap-4 py-4",
                  i < recent.length - 1
                    ? "border-b border-border-subtle"
                    : "pb-5",
                )}
              >
                <time
                  dateTime={e.date}
                  className="w-[70px] shrink-0 pt-0.5 font-mono text-xs text-text-faint"
                >
                  {shortDate(e.date)}
                </time>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold">{e.title}</span>
                    {e.kind === "new" && (
                      <span className="rounded-full bg-[rgba(132,179,106,.16)] px-[7px] py-0.5 text-[11px] font-bold text-success-text">
                        New
                      </span>
                    )}
                    {e.kind === "improved" && (
                      <span className="rounded-full bg-[rgba(111,166,175,.16)] px-[7px] py-0.5 text-[11px] font-bold text-info-text">
                        Improved
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-text-tertiary">
                    {e.highlights[0]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col rounded-[18px] border border-clay-light/[.26] [background:radial-gradient(120%_80%_at_100%_0%,rgba(197,142,94,.18),rgba(20,18,15,.5)_60%),#121110] px-[22px] pt-2 pb-[22px]">
          <div className="flex items-center gap-2 pt-4 pb-3.5 text-[13px] text-text-faint">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-clay-light"
            />
            Coming next
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
            {COMING_NEXT.map((c) => (
              <li
                key={c.name}
                className="surface-key flex flex-col gap-2.5 rounded-xl p-3.5"
              >
                <span
                  aria-hidden="true"
                  className={cn("flex", TINT_TEXT[c.tint])}
                >
                  <KeyIcon icon={categoryIcon(c.name)} box={30} />
                </span>
                <span className="text-[15px] font-bold">{c.name}</span>
                <span className="text-xs text-text-faint">{c.blurb}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[18px] flex flex-wrap items-center gap-3">
            <p className="m-0 flex-[1_1_200px] text-sm text-text-tertiary">
              Missing a tool you reach for every day?
            </p>
            <Link
              href="/request"
              className="btn-action inline-flex min-h-[42px] items-center gap-2 rounded-[10px] px-4 text-sm font-semibold"
            >
              Request a tool
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Install ──────────────────────────────────────────────────────────────

const PILL = "self-start rounded-full px-2 py-[3px] text-[11px] font-bold";

export function InstallSection() {
  return (
    <section
      id="install"
      className="mx-auto flex max-w-[1100px] flex-col gap-9 px-6 pt-10 pb-[120px]"
    >
      <SectionHead
        center
        title="Keep it one keystroke away."
        sub="No installer. No account. Pick how you want it."
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3.5">
        <div className="flex flex-col gap-4 rounded-[18px] border border-clay-light/30 [background:radial-gradient(120%_90%_at_0%_0%,rgba(197,142,94,.24),rgba(20,18,15,.5)_60%),#121110] p-6">
          <span className={cn(PILL, "bg-accent-soft text-[#f0c9a0]")}>
            Recommended
          </span>
          <div
            aria-hidden="true"
            className="surface-key flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 font-mono text-xs text-text-tertiary"
          >
            <span className="grow">utilyx.dev</span>
            <span className="flex size-6 items-center justify-center rounded-md border border-clay-light/60 text-clay-light">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </div>
          <h3 className="m-0 font-sans text-lg font-bold">Install as an app</h3>
          <p className="m-0 text-sm text-text-tertiary">
            Click install in your browser&apos;s address bar. utilyx opens in
            its own window, one click from your dock.
          </p>
          <InstallButton />
        </div>
        <div className="surface-key flex flex-col gap-4 rounded-[18px] p-6">
          <span className={cn(PILL, "bg-white/[.06] text-text-muted")}>
            Zero setup
          </span>
          <div aria-hidden="true" className="flex gap-1.5">
            <span className="flex items-center gap-1.5 rounded-t-[9px] bg-white/[.08] px-3 py-2 text-xs text-text">
              <span className="size-2.5 rounded-[3px] bg-clay-light" />
              utilyx
            </span>
            <span className="px-3 py-2 text-xs text-text-faint">Docs</span>
            <span className="px-3 py-2 text-xs text-text-faint">PR #142</span>
          </div>
          <h3 className="m-0 font-sans text-lg font-bold">Pin a tab</h3>
          <p className="m-0 text-sm text-text-tertiary">
            Right-click the tab and pin it. Your tools sit beside your work all
            day, loaded and ready.
          </p>
        </div>
        <div className="surface-key flex flex-col gap-4 rounded-[18px] p-6">
          <span className={cn(PILL, "bg-white/[.06] text-text-muted")}>
            Power move
          </span>
          <div className="flex items-center gap-2">
            <Keycap className="size-11 rounded-[10px] font-sans text-lg text-text">
              ⌘
            </Keycap>
            <Keycap className="size-11 rounded-[10px] text-[17px] text-clay-light">
              K
            </Keycap>
            <span className="ml-1.5 text-[13px] text-text-faint">
              then type “jwt”
            </span>
          </div>
          <h3 className="m-0 font-sans text-lg font-bold">
            Learn one shortcut
          </h3>
          <p className="m-0 text-sm text-text-tertiary">
            ⌘K works on every page. Type a few letters, hit enter, you&apos;re
            in the tool.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────

export function LandingFaq() {
  return (
    <section
      id="faq"
      className="mx-auto flex max-w-[760px] scroll-mt-6 flex-col gap-7 px-6 pt-10 pb-[120px]"
    >
      <SectionHead
        center
        title="Questions, answered."
        sub="The short version: it's yours, and it's private."
      />
      <div className="flex flex-col gap-2">
        {LANDING_FAQ.map((f, i) => (
          <details
            key={f.q}
            open={i === 0}
            className="group surface-key rounded-[14px] px-5"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3.5 py-[18px] text-base font-semibold [&::-webkit-details-marker]:hidden">
              <span className="grow">{f.q}</span>
              <span
                aria-hidden="true"
                className="text-xl text-text-faint transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="m-0 mb-[18px] text-[15px] text-text-tertiary">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ── Closing ⌘K ───────────────────────────────────────────────────────────

export function ClosingSection() {
  return (
    <section className="relative flex flex-col items-center gap-7 px-6 pt-[100px] pb-[140px] text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 left-1/2 h-[260px] w-[520px] max-w-[90%] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(197,142,94,.28),rgba(197,142,94,0))] blur-[10px]"
      />
      <div aria-hidden="true" className="relative flex gap-3.5">
        <span className="surface-key flex size-24 items-center justify-center rounded-[22px] text-[40px] text-text">
          ⌘
        </span>
        <span className="surface-key flex size-24 items-center justify-center rounded-[22px] font-mono text-[38px] text-clay-light">
          K
        </span>
      </div>
      <h2 className="relative m-0 mt-3 font-sans text-[clamp(38px,5vw,60px)] leading-[1.04] font-bold tracking-[-0.045em]">
        Pick a tool.
        <br />
        <span className="text-text-faint">Get to work.</span>
      </h2>
      <div className="relative flex flex-wrap justify-center gap-3">
        <Link
          href="/tools"
          className="btn-action inline-flex min-h-[46px] items-center rounded-[11px] px-5 text-[15px] font-semibold"
        >
          Browse all tools
        </Link>
        <Link
          href="/tools/json-formatter"
          className="inline-flex min-h-[46px] items-center rounded-[11px] border border-border-strong px-5 text-[15px] font-medium text-text hover:text-white"
        >
          Try JSON Formatter
        </Link>
      </div>
    </section>
  );
}
