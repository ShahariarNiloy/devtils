import { DISTINCT_LIVE_TOOL_COUNT } from "@/lib/implemented-tools";
import { SITE_DOMAIN, SITE_NAME } from "@/lib/site";
import type { Tool } from "@/lib/tools-registry";
import { CATEGORY_TINT, TOOL_PRESENTATION, type Tint } from "@/lib/tools/presentation";
import type { ReactElement, ReactNode } from "react";

/**
 * Social (OG) card layouts, rendered to static PNGs by
 * `scripts/generate-og.ts` (`pnpm og:build`). v2 brand: near-black
 * canvas with the warm clay glow, the four-key diamond mark, Fredoka for
 * titles, Noto Sans for text, the tool's category colour as the accent.
 *
 * Satori has no CSS cascade — every value is inline and every colour a
 * literal. Every element with more than one child needs `display: flex`.
 * Fonts are registered by the script (Fredoka 600, Noto Sans 400/600,
 * JetBrains Mono 400).
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_ALT = `${SITE_NAME} tool preview`;

const BG = "#0b0b0a";
const CREAM = "#f6f2ea";
const MUTED = "#b9b6aa";
const FAINT = "#8b8a82";
const CLAY = "#e0a072";
const TINT_HEX: Record<Tint, string> = { clay: "#e0a072", teal: "#6fa6af", sage: "#adb99a", rose: "#d08070" };

const SANS = "Noto Sans";
const DISPLAY = "Fredoka";
const MONO = "JetBrains Mono";

/** The four-key diamond mark (same geometry as the favicon). */
function Mark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <g transform="rotate(45 32 32)">
        <rect x="11" y="11" width="19" height="19" rx="5" fill={CLAY} />
        <rect x="34" y="11" width="19" height="19" rx="5" fill={CREAM} />
        <rect x="34" y="34" width="19" height="19" rx="5" fill={CREAM} />
        <rect x="11" y="34" width="19" height="19" rx="5" fill={CREAM} />
      </g>
    </svg>
  );
}

function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 18px",
        borderRadius: 999,
        border: `1.5px solid ${color}59`,
        color,
        fontFamily: SANS,
        fontSize: 22,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

/** Shared frame: glow, mark + wordmark, optional pill, body, footer row. */
function Frame({
  pill,
  accent = CLAY,
  children,
  footLeft,
  footRight,
}: {
  pill?: ReactNode;
  accent?: string;
  children: ReactNode;
  footLeft: string;
  footRight?: string;
}): ReactElement {
  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 72px 56px",
        background: `radial-gradient(70% 90% at 100% 0%, ${accent}2e, ${BG} 62%), ${BG}`,
        color: CREAM,
        fontFamily: SANS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Mark />
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 34, fontWeight: 600 }}>{SITE_NAME}</div>
        </div>
        {pill ?? <div style={{ display: "flex" }} />}
      </div>

      {children}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 26,
          borderTop: "1.5px solid rgba(255,255,255,.09)",
          fontFamily: MONO,
          fontSize: 22,
          color: FAINT,
        }}
      >
        <div style={{ display: "flex" }}>{footLeft}</div>
        {footRight ? <div style={{ display: "flex", fontFamily: SANS, fontSize: 22 }}>{footRight}</div> : null}
      </div>
    </div>
  );
}

/** Shrink long titles so they fit in two lines. */
function titleSize(s: string, big: number): number {
  if (s.length > 34) return big - 22;
  if (s.length > 22) return big - 12;
  return big;
}

/** A tool's accent: its category colour. */
export const toolTint = (tool: Tool): string => TINT_HEX[CATEGORY_TINT[tool.category]];

/**
 * One tool: keycap glyph in the category colour, name, tagline. `icon` (an
 * image URL) replaces the glyph when the card's fonts can't draw it.
 */
export function ToolCard({ tool, icon }: { tool: Tool; icon?: string }): ReactElement {
  const p = TOOL_PRESENTATION[tool.slug];
  const tint = toolTint(tool);
  const tagline = p?.tagline ?? tool.description;
  return (
    <Frame
      accent={tint}
      pill={<Pill color={tint}>{tool.category}</Pill>}
      footLeft={`${SITE_DOMAIN}/tools/${tool.slug}`}
      footRight="Free · no sign-up · in your browser"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 148,
            height: 148,
            flexShrink: 0,
            borderRadius: 32,
            background: "linear-gradient(#1f1f1d, #141413)",
            border: "1.5px solid rgba(255,255,255,.10)",
            boxShadow: "0 4px 0 #050505",
            color: tint,
            fontFamily: MONO,
            fontSize: (p?.glyph ?? "").length > 3 ? 34 : 50,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image */}
          {icon ? <img src={icon} width={76} height={76} alt="" /> : (p?.glyph ?? tool.name.slice(0, 2))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 600, fontSize: titleSize(tool.name, 80), lineHeight: 1.02 }}>
            {tool.name}
          </div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: MUTED }}>{tagline}</div>
        </div>
      </div>
    </Frame>
  );
}

/** Home page and any page without its own card. */
export function DefaultCard(): ReactElement {
  return (
    <Frame footLeft={SITE_DOMAIN} footRight={`${DISTINCT_LIVE_TOOL_COUNT} tools · free · no uploads`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: DISPLAY, fontWeight: 600, fontSize: 92, lineHeight: 1.02 }}>
          <div style={{ display: "flex" }}>Every tool you need.</div>
          <div style={{ display: "flex", color: MUTED }}>None you don&apos;t.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: MUTED }}>
          PDFs, images, JSON, SEO — nothing leaves your browser.
        </div>
      </div>
    </Frame>
  );
}

/** A blog post: tag pill, title, reading time. */
export function BlogCard({ title, tag, readingTime, slug }: { title: string; tag: string; readingTime: string; slug: string }): ReactElement {
  return (
    <Frame pill={<Pill color={CLAY}>{`Blog · ${tag}`}</Pill>} footLeft={`${SITE_DOMAIN}/blog/${slug}`} footRight={`${readingTime} read`}>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 600, fontSize: title.length > 70 ? 56 : 66, lineHeight: 1.08 }}>
        {title}
      </div>
    </Frame>
  );
}

/** A section page (blog index, categories, a category): eyebrow, title, line. */
export function PageCard({
  eyebrow,
  title,
  line,
  path,
  tint,
}: {
  eyebrow: string;
  title: string;
  line: string;
  path: string;
  tint?: Tint;
}): ReactElement {
  const accent = tint ? TINT_HEX[tint] : CLAY;
  return (
    <Frame accent={accent} pill={<Pill color={accent}>{eyebrow}</Pill>} footLeft={`${SITE_DOMAIN}${path}`} footRight="Free · no sign-up">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 600, fontSize: titleSize(title, 88), lineHeight: 1.02 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: MUTED }}>{line}</div>
      </div>
    </Frame>
  );
}
