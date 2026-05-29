import { ImageResponse } from "next/og";
import { getToolBySlug, getCategoryMeta } from "@/lib/tools-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";

export const runtime = "edge";
export const alt = "devtils tool preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Per-tool OpenGraph card. Renders 1200×630 at the edge using Next's
 * ImageResponse — no Puppeteer, no headless browser, just an SVG-style
 * layout serialised via Satori. The card carries the tool name + tier +
 * category in the brand's UCLAY-adjacent palette so a link shared in
 * Slack / Twitter / iMessage shows a real card instead of bare text.
 *
 * Edge runtime is required by next/og; the actual rendering is fast
 * (~150ms cold, ~30ms warm) and cached by the network layer.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    return new ImageResponse(<FallbackCard />, size);
  }
  const isLive = IMPLEMENTED_TOOL_SLUGS.has(slug);
  const meta = getCategoryMeta(tool.category);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f6f2ea",
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
              background: "#7e8a6c",
            }}
          />
          devtils
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
              background: meta.iconBg,
              color: meta.iconColor,
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
                background: isLive ? "#5a9e5a" : "#a09a8a",
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
                background: "#dde0d0",
                color: "#3d4435",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontSize: 18,
              }}
            >
              {tool.tier}
            </span>
            <span style={{ alignSelf: "center" }}>devtils.com/tools/{slug}</span>
          </div>
          <span style={{ fontWeight: 600 }}>Runs in your browser ·  100% local</span>
        </div>
      </div>
    ),
    size,
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
        background: "#f6f2ea",
        color: "#1a1a18",
        fontSize: 90,
        fontWeight: 700,
        fontFamily: "system-ui, sans-serif",
        letterSpacing: "-0.04em",
      }}
    >
      devtils
    </div>
  );
}
