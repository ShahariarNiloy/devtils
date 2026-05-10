/* eslint-disable react-hooks/static-components */
import { ToolCard } from '@/components/shared/tool-card';
import { ToolIcon } from '@/components/shared/tool-icon';
import { getDoodle } from "@/lib/doodle-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import {
  getCategoryMeta,
  getRelatedTools,
  type Tool,
} from "@/lib/tools-registry";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Props {
  tool: Tool;
}

/**
 * Placeholder rendered when a registry tool exists but its component
 * isn't shipped yet. Communicates the intended scope and surfaces
 * related tools the user can use right now.
 */
export function ComingSoon({ tool }: Props) {
  const meta = getCategoryMeta(tool.category);
  const Doodle = getDoodle(tool.category);
  const related = getRelatedTools(tool.slug, 6);

  return (
    <>
      {/* ─── Header band ─────────────────────────────── */}
      <section className="border-b border-border bg-bg">
        <div className="mx-auto max-w-8xl px-5 sm:px-8 pt-7 pb-9 sm:pt-9">
          <div className="flex items-center justify-between gap-3 mb-6">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm text-text-faint min-w-0"
            >
              <Link
                href="/tools"
                className="hover:text-text-muted transition-colors shrink-0"
              >
                Tools
              </Link>
              <ChevronRight size={11} aria-hidden className="shrink-0" />
              <Link
                href={`/tools?cat=${encodeURIComponent(tool.category)}`}
                className="hover:text-text-muted transition-colors shrink-0"
              >
                {tool.category}
              </Link>
              <ChevronRight size={11} aria-hidden className="shrink-0" />
              <span className="text-text-muted truncate">{tool.name}</span>
            </nav>
            <Link
              href="/tools"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2 h-7 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
            >
              <ArrowLeft size={12} />
              All tools
            </Link>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-border p-7 sm:p-9"
            style={{
              background:
                "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-soft) 100%)",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute right-6 top-6 hidden sm:block"
              style={{ opacity: 0.45 }}
            >
              <Doodle className="h-24 w-24" stroke={meta.doodleColor} />
            </span>

            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-button"
                style={{ background: meta.iconBg }}
              >
                <ToolIcon
                  name={tool.icon}
                  size={18}
                  style={{ color: meta.iconColor }}
                />
              </div>
              <span className="rounded-full px-2.5 py-1 text-sm font-semibold uppercase tracking-eyebrow bg-mist-sage text-olive-ink">
                Coming soon
              </span>
            </div>

            <h1
              className="display mt-5 text-page sm:text-hero-xs font-semibold text-text"
              style={{ letterSpacing: "-0.03em", lineHeight: 1.08 }}
            >
              {tool.name}
            </h1>
            <p
              className="mt-3 max-w-xl text-sm text-text-muted"
              style={{ lineHeight: 1.55 }}
            >
              {tool.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-eyebrow text-text-faint">
              <span>{tool.category}</span>
              <span>·</span>
              <span>{tool.tier} tier</span>
              {tool.wasm && (
                <>
                  <span>·</span>
                  <span>WASM-powered</span>
                </>
              )}
            </div>

            <p
              className="mt-6 max-w-xl text-sm text-text-muted"
              style={{ lineHeight: 1.6 }}
            >
              We&apos;re still building this one. It&apos;s in the registry so
              we don&apos;t lose track of the scope, but the implementation
              isn&apos;t live yet. In the meantime, the tools below are ready to
              go.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 rounded-button px-4 h-btn-md text-sm font-semibold transition-transform hover:-translate-y-px bg-brand text-text-on-sage"
                style={{
                  boxShadow: "0 6px 18px -10px rgba(61, 68, 53, 0.55)",
                }}
              >
                <ArrowLeft size={14} />
                Back to all tools
              </Link>
              <Link
                href={`/tools?cat=${encodeURIComponent(tool.category)}`}
                className="inline-flex items-center gap-2 rounded-button border border-border bg-transparent px-4 h-btn-md text-sm font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface"
              >
                More {tool.category} tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Related tools ──────────────────────────── */}
      {related.length > 0 && (
        <section className="border-t border-border bg-surface-soft">
          <div className="mx-auto max-w-8xl px-5 sm:px-8 py-12">
            <div className="mb-5">
              <p className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
                In the meantime
              </p>
              <h2 className="display mt-1 text-xl font-semibold tracking-tight text-text">
                Related {tool.category} tools
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {related.map((t, i) => (
                <ToolCard
                  key={t.slug}
                  tool={t}
                  index={i}
                  available={IMPLEMENTED_TOOL_SLUGS.has(t.slug)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
