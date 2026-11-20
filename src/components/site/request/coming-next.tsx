import Link from "next/link";
import { COMING_NEXT } from "@/components/home/landing-data";
import { TOOLS } from "@/lib/tools-registry";
import type { Tint } from "@/lib/tools/presentation";
import { categoryIcon, KeyIcon } from "@/components/shared/key-icon";

const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

/**
 * "Coming next" aside. Replaces the mockup's vote-count list: there is no
 * voting backend, so instead it lists the registry categories that have no
 * live tool yet (they drop out on their own once one ships), with a few of
 * the tools already registered under each.
 */
export function ComingNext() {
  const rows = COMING_NEXT.map((c) => {
    const names = TOOLS.filter((t) => t.category === c.name).map((t) => t.name);
    return { ...c, examples: names.slice(0, 3), more: Math.max(0, names.length - 3) };
  });

  return (
    <aside aria-labelledby="coming-next-title" className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
      <div className="flex items-baseline">
        <h2 id="coming-next-title" className="m-0 grow text-lg font-bold">
          Coming next
        </h2>
        <span className="text-xs text-text-faint">No live tools yet</span>
      </div>
      {rows.length === 0 ? (
        <p className="surface-panel m-0 rounded-[14px] p-3 text-[13px] text-text-tertiary">
          Every category has at least one live tool. Tell us what&apos;s missing.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {rows.map((r) => (
            <li key={r.name} className="surface-panel flex items-center gap-3 rounded-[14px] p-3">
              <span
                aria-hidden="true"
                className={`surface-key flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] font-mono text-base ${TINT_TEXT[r.tint]}`}
              >
                <KeyIcon icon={categoryIcon(r.name)} box={46} />
              </span>
              <span className="flex min-w-0 grow flex-col gap-[3px]">
                <span className="text-[15px] font-bold">{r.name}</span>
                <span className="text-[13px] text-text-tertiary">{r.blurb}</span>
                {r.examples.length > 0 && (
                  <span className="text-xs text-text-faint">
                    {r.examples.join(", ")}
                    {r.more > 0 && ` and ${r.more} more`}
                  </span>
                )}
              </span>
              <span className="shrink-0 rounded-full bg-info-bg px-[9px] py-[3px] text-[11px] font-bold text-info-text">
                Planned
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 mt-1 text-[13px] text-text-faint">
        Want to see what already shipped?{" "}
        <Link href="/changelog" className="text-text-tertiary underline-offset-2 hover:text-text hover:underline">
          Read the changelog
        </Link>
        .
      </p>
    </aside>
  );
}
