import {
  ArrowUpRight,
  Binary,
  Braces,
  Calculator,
  Code2,
  Database,
  FileText,
  Image as ImageIcon,
  Network,
  Palette,
  ShieldCheck,
  Type,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  CATEGORIES,
  CATEGORY_COUNTS,
  TOOL_COUNT,
  type ToolCategory,
} from "@/lib/tools-registry";
import { Band } from "./band";
import { SectionHeading } from "./section-heading";

const CATEGORY_ICON: Partial<Record<ToolCategory, LucideIcon>> = {
  JSON: Braces,
  Text: Type,
  Encoding: Binary,
  Image: ImageIcon,
  PDF: FileText,
  Code: Code2,
  Design: Palette,
  Calc: Calculator,
  Network: Network,
  Security: ShieldCheck,
  Data: Database,
};

function CategoryTile({
  cat,
  feature = false,
}: {
  cat: ToolCategory;
  feature?: boolean;
}) {
  const Icon = CATEGORY_ICON[cat] ?? Code2;
  const count = CATEGORY_COUNTS[cat] ?? 0;
  const soon = count === 0;
  return (
    <Link
      href={`/tools?cat=${encodeURIComponent(cat)}`}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card",
        feature ? "p-6 sm:col-span-2 sm:row-span-2" : "p-4",
      )}
    >
      {/* Oversized count numeral — editorial motif, warms to clay on hover */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute select-none font-mono font-bold leading-none tabular-nums text-text-faint/10 transition-colors duration-200 group-hover:text-clay/25",
          feature ? "-right-2 -top-3 text-[10rem]" : "-right-1 -top-2 text-6xl",
        )}
      >
        {soon ? "·" : count}
      </span>

      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl",
          feature ? "h-12 w-12" : "h-9 w-9",
        )}
        style={{
          background: "var(--color-mist-sage)",
          color: "var(--color-olive-ink)",
        }}
        aria-hidden
      >
        <Icon size={feature ? 22 : 16} />
      </span>

      <div className="relative mt-4">
        <span
          className={cn(
            "block truncate font-semibold text-text",
            feature ? "text-2xl tracking-tight" : "text-[15px]",
          )}
        >
          {cat}
        </span>
        <span className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-tag text-text-faint">
          {soon ? "Soon" : `${count} ${count === 1 ? "tool" : "tools"}`}
          {feature && !soon && (
            <span className="inline-flex items-center gap-1 text-text-muted">
              <span aria-hidden className="text-text-faint/40">
                ·
              </span>
              Browse
              <ArrowUpRight size={12} aria-hidden />
            </span>
          )}
        </span>
      </div>

      {/* Clay underline wipes in on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 ease-out-strong group-hover:scale-x-100"
        style={{ background: "var(--color-clay)" }}
      />
    </Link>
  );
}

/** Browse-by-category bento — one large feature tile + a varied grid. */
export function CategoriesSection() {
  // Sort by tool count so the busiest category becomes the feature tile.
  const sorted = [...CATEGORIES].sort(
    (a, b) => (CATEGORY_COUNTS[b] ?? 0) - (CATEGORY_COUNTS[a] ?? 0),
  );
  const [feature, ...rest] = sorted;

  return (
    <Band aria-label="Browse by category" className="pt-16 pb-20">
      <SectionHeading
        index="02"
        eyebrow="Browse"
        title="Explore by category"
        hint={`${CATEGORIES.length} categories · ${TOOL_COUNT} tools`}
        cta={{ href: "/tools", label: "All tools" }}
      />
      <div className="grid auto-rows-[116px] grid-cols-2 gap-3 sm:grid-cols-4">
        <CategoryTile cat={feature} feature />
        {rest.map((cat) => (
          <CategoryTile key={cat} cat={cat} />
        ))}
      </div>
    </Band>
  );
}
