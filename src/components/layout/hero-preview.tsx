"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ToolIcon } from "../shared/tool-icon";

/**
 * Hero right panel — a "file deck" of the brand palette. Each layer is one
 * brand colour carrying a single tool chip; the cards overlap like files in
 * a drawer. The ladder runs light → dark top-to-bottom and the fully-exposed
 * front card is the flagship: JSON Formatter.
 *
 * Modern touches: a layered colour-mesh backdrop, per-card material sheen,
 * a diagonal light-sweep on hover, an editorial index, and a glowing,
 * scaled-up flagship card with an explicit CTA. Every layer is a fixed
 * palette token so the deck reads identically in light and dark.
 */

interface DeckCard {
  slug: string;
  name: string;
  hint: string;
  icon: string;
  tag: string;
  bg: string;
  fg: string;
  /** Icon-chip + tag wash. */
  chip: string;
  /** Resting rotation for the hand-stacked fan. */
  rot: number;
}

// Ordered light → dark, top → bottom. Last entry is the exposed flagship.
const DECK: DeckCard[] = [
  {
    slug: "base64",
    name: "Base64",
    hint: "Encode · decode",
    icon: "binary",
    tag: "ENCODING",
    bg: "var(--color-bone-cream)",
    fg: "var(--color-olive-ink)",
    chip: "rgba(61,68,53,0.10)",
    rot: -6,
  },
  {
    slug: "json-to-typescript",
    name: "JSON → TypeScript",
    hint: "Infer types instantly",
    icon: "file-code",
    tag: "CODE",
    bg: "var(--color-mist-sage)",
    fg: "var(--color-olive-ink)",
    chip: "rgba(61,68,53,0.11)",
    rot: -4.5,
  },
  {
    slug: "color-converter",
    name: "Color Converter",
    hint: "HEX · RGB · OKLCH · HSL",
    icon: "pipette",
    tag: "DESIGN",
    bg: "var(--color-clay)",
    fg: "var(--color-charcoal)",
    chip: "rgba(26,26,24,0.13)",
    rot: -3,
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    hint: "Live match highlight",
    icon: "regex",
    tag: "TEXT",
    bg: "var(--color-sage-olive)",
    fg: "var(--color-bone-cream)",
    chip: "rgba(255,255,255,0.18)",
    rot: -1.5,
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    hint: "Format · validate · query · tree",
    icon: "braces",
    tag: "JSON",
    bg: "var(--color-olive-ink)",
    fg: "var(--color-mist-sage)",
    chip: "rgba(255,255,255,0.15)",
    rot: 0,
  },
];

// Single-light-source sheen so each flat colour reads as a physical card.
const SHEEN =
  "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 36%, rgba(0,0,0,0.12) 100%)";

// Layered colour-mesh backdrop. Accents use theme-ADAPTIVE tokens
// (surface-sage flips dark) and modest mixes, so it stays a calm glow in
// both light and dark instead of a pale wash on the dark base.
const MESH = [
  "radial-gradient(90% 70% at 88% 4%, color-mix(in oklab, var(--color-surface-sage) 55%, transparent) 0%, transparent 60%)",
  "radial-gradient(85% 70% at 4% 100%, color-mix(in oklab, var(--color-sage-olive) 20%, transparent) 0%, transparent 58%)",
  "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface-soft) 100%)",
].join(",");

export function HeroPreview() {
  return (
    <div
      className="relative flex h-full min-h-[520px] items-center justify-center overflow-hidden rounded-2xl border border-border px-8"
      style={{ background: MESH }}
    >
      <div className="relative w-full max-w-[348px]">
        {DECK.map((card, i) => {
          const isFront = i === DECK.length - 1;
          return (
            <div
              key={card.slug}
              className="group/card relative z-0 origin-bottom rotate-[var(--rot)] transition-all duration-300 ease-out hover:z-20 hover:-translate-y-3 hover:rotate-0 focus-within:z-20 focus-within:-translate-y-3 focus-within:rotate-0"
              style={
                {
                  marginTop: i === 0 ? 0 : -54,
                  "--rot": `${card.rot}deg`,
                } as React.CSSProperties
              }
            >
              {/* flagship colour glow — outside the card's overflow clip */}
              {isFront && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-3 rounded-2xl blur-2xl"
                  style={{ background: "var(--color-sage-olive)", opacity: 0.4 }}
                />
              )}

              <Link
                href={`/tools/${card.slug}`}
                className={`relative block overflow-hidden rounded-xl transition-shadow duration-300 ease-out focus-visible:outline-none ${
                  isFront
                    ? "shadow-[0_26px_56px_-20px_rgba(26,26,24,0.62)] group-hover/card:shadow-[0_34px_66px_-22px_rgba(26,26,24,0.7)]"
                    : "shadow-[0_16px_34px_-18px_rgba(26,26,24,0.5)] group-hover/card:shadow-[0_28px_54px_-20px_rgba(26,26,24,0.62)]"
                }`}
                style={{ background: card.bg, color: card.fg }}
              >
                {/* material sheen + crisp top hairline */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background: SHEEN,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                  }}
                />

                {/* diagonal light-sweep on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 -translate-x-[260%] bg-gradient-to-r from-transparent via-white/22 to-transparent transition-transform duration-700 ease-out group-hover/card:translate-x-[420%]"
                />

                <div className={`relative ${isFront ? "p-6" : "p-5"}`}>
                  {/* strip: chip + name + index/tag + arrow */}
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: card.chip }}
                      aria-hidden
                    >
                      <ToolIcon name={card.icon} size={17} style={{ color: card.fg }} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold tracking-tight">
                        {card.name}
                      </span>
                    </span>

                    <span
                      className="hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider sm:inline-flex"
                      style={{ background: card.chip }}
                    >
                      <span className="opacity-60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span aria-hidden style={{ opacity: 0.3 }}>
                        /
                      </span>
                      {card.tag}
                    </span>

                    <ArrowUpRight
                      size={16}
                      aria-hidden
                      className="shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover/card:translate-x-0 group-hover/card:opacity-70 group-focus-within/card:translate-x-0 group-focus-within/card:opacity-70"
                    />
                  </div>

                  {/* hint — fully visible only on the front card / on hover */}
                  {isFront ? (
                    <div className="mt-3 flex items-center justify-between">
                      <p
                        className="text-[12.5px] font-medium"
                        style={{ color: card.fg, opacity: 0.78 }}
                      >
                        {card.hint}
                      </p>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                        style={{ background: card.chip, color: card.fg }}
                      >
                        Open
                        <ArrowUpRight size={13} aria-hidden />
                      </span>
                    </div>
                  ) : (
                    <p
                      className="mt-3 text-[12.5px] font-medium"
                      style={{ color: card.fg, opacity: 0.78 }}
                    >
                      {card.hint}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
