import Link from "next/link";
import type { ReactNode } from "react";
import { GHOST_KEYS } from "./landing-data";

interface Perk {
  title: string;
  body: string;
  stroke: string;
  icon: ReactNode;
}

const PERKS: Perk[] = [
  { title: "Fast.", body: "Decoded in 1.1 ms.", stroke: "var(--color-cat-clay)", icon: <path d="M13 2 4 14h7l-1 8 9-12h-7z" /> },
  {
    title: "Private.", body: "0 bytes sent.", stroke: "var(--color-cat-sage)",
    icon: (<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>),
  },
  {
    title: "Keyboard-first.", body: "⌘K to anything.", stroke: "var(--color-cat-teal)",
    icon: (<><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>),
  },
  {
    title: "Offline.", body: "Load once, use anywhere.", stroke: "var(--color-cat-rose)",
    icon: (<><path d="M2 12a10 10 0 0 1 20 0" /><path d="M5 12a7 7 0 0 1 14 0" /><circle cx="12" cy="12" r="1.5" /></>),
  },
  {
    title: "No account.", body: "Open and go.", stroke: "var(--color-cat-clay)",
    icon: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /><path d="m3 3 18 18" /></>),
  },
  {
    title: "Free.", body: "Free at the core, forever.", stroke: "var(--color-cat-sage)",
    icon: (<><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><circle cx="17" cy="14" r="1" /></>),
  },
];

export function KeyboardBento() {
  return (
    <section className="relative mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-14 px-6 pt-[140px] pb-[120px]">
      <div className="flex flex-col gap-[22px]">
        <h2 className="m-0 font-sans text-[clamp(30px,3.4vw,40px)] leading-[1.12] font-bold tracking-[-0.035em]">
          It&apos;s not about saving clicks.
          <br />
          <span className="text-text-faint">It&apos;s about never leaving the keyboard.</span>
        </h2>
        <div>
          <Link href="/tools" className="btn-action inline-flex min-h-11 items-center rounded-[10px] px-[18px] text-sm font-semibold">
            Open utilyx
          </Link>
        </div>
      </div>

      <div className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-5 -inset-y-10 grid grid-cols-6 gap-2.5 opacity-55">
          {GHOST_KEYS.map((k, i) => (
            // Decorative keyboard; positions are the identity.
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className="surface-key-ghost flex h-16 items-center justify-center rounded-xl font-mono text-lg text-selected">
              {k}
            </span>
          ))}
        </div>
        <div className="relative grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
          {PERKS.map((p) => (
            <div key={p.title} className="surface-key flex flex-col gap-[22px] rounded-[14px] p-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {p.icon}
              </svg>
              <p className="m-0 text-sm leading-[1.4] text-text-faint">
                <strong className="font-bold text-text">{p.title}</strong> {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
