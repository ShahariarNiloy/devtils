import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { SITE_DOMAIN, SITE_NAME, SITE_WORDMARK } from "@/lib/site";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import type { ReactElement } from "react";

/**
 * OG card layout. Editorial / handcrafted aesthetic per AGENTS.md:
 * warm cream gradient, brand chartreuse as accent only (left stripe,
 * tier marker, watermark mark), category-coloured eyebrow for variety
 * across the catalogue.
 *
 * Satori has no CSS cascade — every value is inline, every colour is a
 * literal hex. `var(--color-*)` tokens that CATEGORY_META carries get
 * resolved to hex in `TOKEN_HEX` below.
 *
 * Re-render after this file changes via `pnpm og:build`.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_ALT = `${SITE_NAME} tool preview`;

/**
 * Palette anchors — all from globals.css `@theme`. Brand accents are
 * olive (the `--color-brand` family) — NOT chartreuse. AGENTS.md uses
 * the word "chartreuse" loosely; the actual tokens are sage / olive.
 */
const BRAND = "#3d4435"; // --color-brand, primary accent (dark olive)
const BRAND_MID = "#7e8a6c"; // --color-border-strong, medium olive
const BRAND_SOFT = "#3d443514"; // ~8% alpha — chip fills
const BRAND_TINT = "#3d443530"; // ~19% alpha — separators
const SURFACE_SAGE = "#dde0d0"; // --color-surface-sage, soft tint

/** Cream surface gradient — `--color-canvas` → `--color-surface-soft`. */
const BG_GRADIENT = "linear-gradient(135deg, #f6f2ea 0%, #ebede5 100%)";
const INK = "#1a1a18"; // --color-text
const INK_MUTED = "#3d4435"; // matches --color-brand for muted ink role
const INK_FAINT = "#5a615a"; // --color-text-faint
const BORDER = "#d6d2c2"; // --color-border

const TOKEN_HEX: Record<string, string> = {
  "var(--color-surface-tint)": "#efe0cc",
  "var(--color-cream)": "#efe0cc",
  "var(--color-sage)": "#dde0d0",
  "var(--color-sage-deep)": "#5d6a4d",
  "var(--color-terracotta)": "#a76f3e",
  "var(--color-terracotta-deep)": "#8e5d36",
  "var(--color-amber)": "#c58e5e",
};

const hex = (value: string | undefined, fallback: string): string =>
  (value && TOKEN_HEX[value]) ?? (value?.startsWith("#") ? value : fallback);

/** Vertical olive stripe along the left edge — brand accent at full
 *  saturation, narrow enough to read as a frame rather than a fill. */
function LeftStripe(): ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 8,
        backgroundColor: BRAND,
      }}
    />
  );
}

/** Wordmark + chartreuse pip — top-left brand strip. */
function BrandStrip(): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: "-0.025em",
        color: INK,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          backgroundColor: BRAND_MID,
        }}
      />
      {SITE_WORDMARK}
    </div>
  );
}

/** Category eyebrow chip. Colour comes from CATEGORY_META so variety reads. */
function CategoryEyebrow({ tool }: { tool: Tool }): ReactElement {
  const meta = getCategoryMeta(tool.category);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 18px",
        borderRadius: 999,
        backgroundColor: hex(meta.iconBg, "#dde0d0"),
        color: hex(meta.iconColor, "#3d4435"),
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {tool.category}
    </div>
  );
}

/** Decorative ornament — fading olive bars, bottom-right corner. */
function Ornament(): ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        right: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {[1, 0.7, 0.45, 0.25].map((opacity, i) => (
        <div
          key={i}
          style={{
            width: 72,
            height: 8,
            backgroundColor: BRAND_MID,
            opacity,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Per-tool OG card — 1200×630.
 *
 * Layout (top → bottom):
 *   [LeftStripe] | brand row · category eyebrow
 *                | tool name (huge)
 *                | description
 *                | tag chips (up to 3)
 *                | footer band: tier + url · runs-in-browser tagline
 *                | (Ornament floats bottom-right)
 */
export function ToolCard({ tool }: { tool: Tool }): ReactElement {
  const isLive = IMPLEMENTED_TOOL_SLUGS.has(tool.slug);
  const tags = tool.tags.slice(0, 3);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundImage: BG_GRADIENT,
        backgroundColor: "#f6f2ea",
        fontFamily: "system-ui, sans-serif",
        color: INK,
      }}
    >
      <LeftStripe />
      <Ornament />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "76px 84px 72px 100px",
          position: "relative",
        }}
      >
        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BrandStrip />
          <CategoryEyebrow tool={tool} />
        </div>

        {/* Tool name — adaptive sizing keyed to character count so a
            24-char name like "JSON to TypeScript types" still fits on
            one line. Thresholds were tuned against the actual catalogue
            so the 4-tier table covers every live tool without wrapping.
            `flexDirection: column` keeps Satori's wrapped-text height
            calculation honest if any edge-case name does wrap. */}
        {(() => {
          const len = tool.name.length;
          const titleSize =
            len <= 14 ? 104 : len <= 18 ? 92 : len <= 26 ? 72 : 60;
          return (
            <div
              style={{
                marginTop: 72,
                display: "flex",
                flexDirection: "column",
                fontSize: titleSize,
                fontWeight: 700,
                letterSpacing: "-0.045em",
                lineHeight: 1.1,
                color: INK,
                maxWidth: 980,
              }}
            >
              <span>{tool.name}</span>
            </div>
          );
        })()}

        {/* Description */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            fontSize: 26,
            lineHeight: 1.4,
            color: INK_MUTED,
            maxWidth: 880,
            fontWeight: 500,
          }}
        >
          {tool.description}
        </div>

        {/* Tag chips */}
        {tags.length > 0 && (
          <div style={{ marginTop: 36, display: "flex", gap: 10 }}>
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  borderRadius: 999,
                  backgroundColor: SURFACE_SAGE,
                  fontSize: 18,
                  color: INK_MUTED,
                  fontFamily: "ui-monospace, Menlo, monospace",
                  letterSpacing: "-0.01em",
                }}
              >
                #{tag}
              </div>
            ))}
          </div>
        )}

        {/* Footer band */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 36,
            borderTopWidth: 2,
            borderTopStyle: "solid",
            borderTopColor: BRAND_TINT,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                borderWidth: 1.5,
                borderStyle: "solid",
                borderColor: BRAND,
                backgroundColor: BRAND_SOFT,
                color: INK_MUTED,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontSize: 17,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}
            >
              {tool.tier}
            </span>
            <span
              style={{
                fontSize: 22,
                color: INK_MUTED,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}
            >
              {SITE_DOMAIN}/tools/{tool.slug}
            </span>
          </div>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 20,
              color: INK_FAINT,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: isLive ? BRAND_MID : INK_FAINT,
              }}
            />
            Runs in your browser · 100% local
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Default fallback card — used by the homepage, generic pages, and any
 * tool slug that hasn't been re-generated yet.
 */
export function DefaultCard(): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundImage: BG_GRADIENT,
        backgroundColor: "#f6f2ea",
        fontFamily: "system-ui, sans-serif",
        color: INK,
      }}
    >
      <LeftStripe />
      <Ornament />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "76px 84px 72px 100px",
          justifyContent: "center",
        }}
      >
        {/* Big wordmark — hero treatment */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            fontSize: 144,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            color: INK,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: BRAND_MID,
            }}
          />
          {SITE_WORDMARK}
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 36,
            display: "flex",
            fontSize: 38,
            color: INK_MUTED,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
            maxWidth: 940,
          }}
        >
          Handcrafted developer utilities. Every tool runs in your browser —
          fast, keyboard-first, and private by default.
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 80,
            display: "flex",
            alignItems: "center",
            gap: 20,
            paddingTop: 28,
            borderTopWidth: 2,
            borderTopStyle: "solid",
            borderTopColor: BRAND_TINT,
          }}
        >
          <span
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              borderWidth: 1.5,
              borderStyle: "solid",
              borderColor: BRAND,
              backgroundColor: BRAND_SOFT,
              color: INK_MUTED,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontSize: 17,
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            Open source
          </span>
          <span
            style={{
              fontSize: 24,
              color: INK_MUTED,
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            {SITE_DOMAIN}
          </span>
        </div>
      </div>
    </div>
  );
}
