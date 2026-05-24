import { Band } from "./band";

/**
 * "The idea" — a quiet, big-type manifesto. Deliberately not cards, not a
 * grid, not a list: a personality beat that breaks the card-heavy rhythm and
 * gives the page a point of view. One clay-accented word is the only flourish.
 */
export function ManifestoSection() {
  return (
    <Band tone="soft" aria-label="The idea" className="pt-20 pb-24">
      {/* Chaptered kicker, matching the section headings */}
      <span className="inline-flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-eyebrow text-text-faint">
        <span
          className="h-3.5 w-[3px] rounded-full"
          style={{ background: "var(--color-sage-olive)" }}
          aria-hidden
        />
        <span className="text-clay">03</span>
        <span aria-hidden className="text-text-faint/40">
          /
        </span>
        The idea
      </span>

      <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-12 lg:items-end">
        <p className="display text-balance text-3xl font-semibold leading-[1.16] tracking-tight text-text sm:text-4xl lg:col-span-8 lg:text-[3.25rem]">
          Good tools get out of your way. Ours stay{" "}
          <span className="text-clay">private</span>, fast, and free.
        </p>

        <div className="lg:col-span-4 lg:pb-2">
          <p className="text-pretty text-base leading-desc text-text-muted">
            No accounts, no uploads, no upsells — every tool runs on your
            machine, and nothing you touch ever leaves it.
          </p>
          <p className="mt-5 font-mono text-xs uppercase tracking-eyebrow text-text-faint">
            — built quietly
          </p>
        </div>
      </div>
    </Band>
  );
}
