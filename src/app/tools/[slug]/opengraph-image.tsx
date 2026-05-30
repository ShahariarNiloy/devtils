import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { SITE_DOMAIN, SITE_NAME, SITE_WORDMARK } from "@/lib/site";
import { getCategoryMeta, getToolBySlug } from "@/lib/tools-registry";
import { ImageResponse } from "next/og";

export const alt = `${SITE_NAME} tool preview`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Per-tool OpenGraph card. Renders 1200×630 using Next's ImageResponse —
 * no Puppeteer, no headless browser, just an SVG-style layout serialised
 * via Satori. The card carries the tool name + tier + category in the
 * brand's UCLAY-adjacent palette so a link shared in Slack / Twitter /
 * iMessage shows a real card instead of bare text.
 *
 * Runs on the Node.js runtime (default) — ImageResponse no longer requires
 * edge, and the serverless size budget avoids the 1 MB edge function cap.
 * Output is cached by the network layer / social platforms after first hit.
 */
/**
 * Satori has no CSS cascade, so the `var(--color-*)` tokens that
 * CATEGORY_META carries cannot be resolved at render time — they paint
 * black. We resolve them to literal hex here. NOTE: the tokens below
 * (terracotta / sage / surface-tint / cream / amber) are NOT defined in
 * globals.css; these hex values are their closest real-palette intent.
 */
const TOKEN_HEX: Record<string, string> = {
  "var(--color-surface-tint)": "#efe0cc",
  "var(--color-cream)": "#efe0cc",
  "var(--color-sage)": "#dde0d0",
  "var(--color-sage-deep)": "#5d6a4d",
  "var(--color-terracotta)": "#a76f3e",
  "var(--color-terracotta-deep)": "#8e5d36",
  "var(--color-amber)": "#c58e5e",
};

/** Resolve a DS token (or raw color) to a Satori-safe literal hex. */
const hex = (value: string | undefined, fallback: string): string =>
  (value && TOKEN_HEX[value]) ?? (value?.startsWith("#") ? value : fallback);

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    return new ImageResponse(<FallbackCard />, size);
  }
  const isLive = IMPLEMENTED_TOOL_SLUGS.has(slug);
  const meta = getCategoryMeta(tool.category);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f6f2ea",
        fontFamily: "system-ui, sans-serif",
        color: "#1a1a18",
        padding: 80,
        position: "relative",
      }}
    >
      {/* Brand mark — top-left */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#7e8a6c",
          }}
        />
        {SITE_WORDMARK}
      </div>

      {/* Category eyebrow + status pill — center-left top */}
      <div
        style={{
          marginTop: 70,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            backgroundColor: hex(meta.iconBg, "#dde0d0"),
            color: hex(meta.iconColor, "#3d4435"),
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {tool.category}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            border: "2px solid",
            borderColor: isLive ? "#5a9e5a" : "#a09a8a",
            color: isLive ? "#3e7a3e" : "#5a615a",
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: isLive ? "#5a9e5a" : "#a09a8a",
            }}
          />
          {isLive ? "Live" : "Coming soon"}
        </div>
      </div>

      {/* Tool name — main display */}
      <div
        style={{
          marginTop: 30,
          display: "flex",
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.04,
          color: "#1a1a18",
          maxWidth: 980,
        }}
      >
        {tool.name}
      </div>

      {/* Description — secondary */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          fontSize: 26,
          lineHeight: 1.4,
          color: "#3d4435",
          maxWidth: 980,
        }}
      >
        {tool.description}
      </div>

      {/* Footer band — tier + url */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 32,
          borderTop: "2px solid #d6d2c2",
          fontSize: 22,
          color: "#5a615a",
        }}
      >
        <div style={{ display: "flex", gap: 20 }}>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              backgroundColor: "#dde0d0",
              color: "#3d4435",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontSize: 18,
            }}
          >
            {tool.tier}
          </span>
          <span style={{ alignSelf: "center" }}>{SITE_DOMAIN}/tools/{slug}</span>
        </div>
        <span style={{ fontWeight: 600 }}>
          Runs in your browser · 100% local
        </span>
      </div>
    </div>,
    size
  );
}

function FallbackCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f6f2ea",
        color: "#1a1a18",
        fontSize: 90,
        fontWeight: 700,
        fontFamily: "system-ui, sans-serif",
        letterSpacing: "-0.04em",
      }}
    >
      {SITE_WORDMARK}
    </div>
  );
}
