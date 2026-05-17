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
import {
  CATEGORIES,
  CATEGORY_COUNTS,
  TOOL_COUNT,
  type ToolCategory,
} from "@/lib/tools-registry";
import { Band } from "./band";
import { SectionHeading } from "./section-heading";

// On-brand icon per category. Falls back to Code2 for anything unmapped
// (e.g. Next.js / React) so the grid never renders an empty chip.
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

/** Browse-by-category grid — the main self-navigation path on the home page. */
export function CategoriesSection() {
  return (
    <Band tone="soft" aria-label="Browse by category" className="pt-14 pb-16">
      <SectionHeading
        eyebrow="Browse"
        title="Explore by category"
        hint={`${CATEGORIES.length} categories · ${TOOL_COUNT} tools`}
        cta={{ href: "/tools", label: "All tools" }}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICON[cat] ?? Code2;
          const count = CATEGORY_COUNTS[cat] ?? 0;
          return (
            <Link
              key={cat}
              href={`/tools?cat=${encodeURIComponent(cat)}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-card"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "var(--color-mist-sage)",
                  color: "var(--color-olive-ink)",
                }}
                aria-hidden
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">
                  {cat}
                </span>
                <span className="text-xs text-text-faint">
                  {count} {count === 1 ? "tool" : "tools"}
                </span>
              </span>
              <ArrowUpRight
                size={14}
                aria-hidden
                className="shrink-0 -translate-x-1 text-text-faint opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-70"
              />
            </Link>
          );
        })}
      </div>
    </Band>
  );
}
