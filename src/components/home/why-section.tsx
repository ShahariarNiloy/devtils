import type { ReactNode } from "react";
import { LandingFastArt } from "@/components/illustrations/landing-fast";
import { LandingPrivateArt } from "@/components/illustrations/landing-private";
import { LandingSimpleArt } from "@/components/illustrations/landing-simple";
import { LIVE_COUNT } from "./landing-data";
import { PauseOffscreen } from "@/components/shared/pause-offscreen";

interface Pillar {
  n: string;
  title: string;
  body: string;
  foot: string;
  art: ReactNode;
}

const ART = "h-full w-full";

const PILLARS: Pillar[] = [
  {
    n: "01 · Fast",
    title: "Three keystrokes to any tool",
    body: "Press ⌘K anywhere, type a few letters, hit enter. The tool opens with your cursor in the input, and results update as you type.",
    foot: "⌘K → jwt → ↵",
    art: <LandingFastArt className={ART} />,
  },
  {
    n: "02 · Simple",
    title: "Paste, and it figures out the rest",
    body: "Tools detect what you pasted and pick sensible defaults. Every tool has the same layout, so once you know one, you know them all. Copy the result in one click.",
    foot: `No sign-up · No setup · Same layout in all ${LIVE_COUNT} tools`,
    art: <LandingSimpleArt className={ART} />,
  },
  {
    n: "03 · Private",
    title: "What you paste stays on your device",
    body: "Tools process your input in the browser, so tokens and payloads aren't uploaded to us. You can check it yourself in DevTools.",
    foot: "0 requests when you paste",
    art: <LandingPrivateArt className={ART} />,
  },
];

/** "Why utilyx — Fast. Simple. Private." Three pillars with line art. */
export function WhySection() {
  return (
    // PauseOffscreen: the drawings' dash animations tick on the main thread,
    // so they only run while this section is on screen (~8% of a core saved
    // on every landing visit, measured).
    <PauseOffscreen>
      <section
        id="how-it-works"
        className="mx-auto flex max-w-[1160px] scroll-mt-6 flex-col gap-10 px-6 pt-5 pb-[120px]"
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span className="font-mono text-xs text-clay-light">Why utilyx</span>
          <h2 className="m-0 text-[clamp(30px,3.4vw,40px)] leading-[1.12] text-text">
            Fast. Simple. Private.
          </h2>
          <p className="m-0 max-w-[560px] text-[17px] leading-[1.6] text-text-tertiary">
            The three things a tool you open twenty times a day has to get
            right.
          </p>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3.5 p-0">
          {PILLARS.map((p) => (
            <li
              key={p.n}
              className="flex flex-col gap-3.5 rounded-[18px] border border-white/[.07] bg-[rgba(18,18,17,.6)] p-6"
            >
              <div className="flex h-[190px] items-center justify-center rounded-xl bg-[#0d0d0c] px-1 py-1.5">
                {p.art}
              </div>
              <span className="font-mono text-xs text-clay-light">{p.n}</span>
              <h3 className="m-0 text-[22px] text-text">{p.title}</h3>
              <p className="m-0 text-[15px] leading-[1.6] text-text-tertiary">
                {p.body}
              </p>
              <span className="mt-auto pt-1.5 font-mono text-xs text-text-strong">
                {p.foot}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </PauseOffscreen>
  );
}
