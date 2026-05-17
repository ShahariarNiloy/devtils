import { memo } from "react";
import { CHAR_W, HEADER_H, NODE_PAD, ROW_H } from "./json-graph.lib";
import type { ScalarType } from "./json-graph.lib";
import type { PositionedNode } from "./layout";

function valueColor(t: ScalarType | undefined): string {
  if (t === "string") return "var(--tok-string)";
  if (t === "number") return "var(--tok-number)";
  if (t === "boolean") return "var(--tok-bool)";
  return "var(--tok-null)";
}

function glyphFor(kind: PositionedNode["kind"]): string {
  if (kind === "array") return "[ ]";
  if (kind === "object") return "{ }";
  return "•";
}

function clip(text: string, max: number): string {
  if (max <= 0) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Fit `key` + `rest` into a character budget. The key is kept whole when
 * it fits (truncated only if it alone overflows); otherwise the value/rest
 * is the part that gets the ellipsis.
 */
function fitRow(
  key: string,
  rest: string,
  max: number,
): { key: string; rest: string } {
  if (key.length >= max) return { key: clip(key, max), rest: "" };
  return { key, rest: clip(rest, max - key.length) };
}

interface GraphNodeProps {
  node: PositionedNode;
  uid: number;
  collapsible: boolean;
  collapsed: boolean;
  onToggle: (id: string) => void;
}

function GraphNodeImpl({
  node,
  uid,
  collapsible,
  collapsed,
  onToggle,
}: GraphNodeProps) {
  const clipId = `gnode-clip-${uid}`;
  const typeGlyph = glyphFor(node.kind);

  const innerW = node.width - NODE_PAD * 2;
  const rowMax = Math.max(1, Math.floor(innerW / CHAR_W));
  // Header reserves room for the collapse chevron when present.
  const headerMax = Math.max(
    1,
    Math.floor((innerW - (collapsible ? 16 : 0)) / CHAR_W),
  );

  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <clipPath id={clipId}>
        <rect width={node.width} height={node.height} rx={8} />
      </clipPath>

      {/* Card */}
      <rect
        width={node.width}
        height={node.height}
        rx={8}
        fill="var(--color-surface)"
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      <g clipPath={`url(#${clipId})`}>
        {/* Zebra row bands — subtle, theme-safe overlay on odd rows */}
        {node.rows.map((r, i) =>
          i % 2 === 1 ? (
            <rect
              key={`band-${r.key || i}`}
              x={0}
              y={HEADER_H + i * ROW_H}
              width={node.width}
              height={ROW_H}
              fill="var(--color-text)"
              opacity={0.04}
            />
          ) : null,
        )}

        {/* Header */}
        <rect width={node.width} height={HEADER_H} fill="var(--color-silver)" />
        <line
          x1={0}
          y1={HEADER_H}
          x2={node.width}
          y2={HEADER_H}
          stroke="var(--color-border-subtle)"
          strokeWidth={1}
        />
        <text
          x={NODE_PAD}
          y={HEADER_H / 2}
          dominantBaseline="central"
          fontFamily="var(--font-mono)"
          fontSize={12}
          fontWeight={600}
          fill="var(--color-text-muted)"
        >
          {clip(`${typeGlyph}  ${node.label}`, headerMax)}
        </text>
        {collapsible && (
          <text
            x={node.width - NODE_PAD}
            y={HEADER_H / 2}
            textAnchor="end"
            dominantBaseline="central"
            fontFamily="var(--font-mono)"
            fontSize={12}
            fontWeight={700}
            fill="var(--color-text-muted)"
          >
            {collapsed ? "▸" : "▾"}
          </text>
        )}

        {/* Rows */}
        {node.rows.map((r, i) => {
          const rowY = HEADER_H + i * ROW_H + ROW_H / 2;
          const isLink = Boolean(r.childId);
          const restRaw = isLink
            ? `${r.key !== "" ? " " : ""}${
                r.childKind === "array"
                  ? `[${r.childCount}]`
                  : `{${r.childCount}}`
              }`
            : `${r.key !== "" ? ": " : ""}${r.value ?? ""}`;
          const fit = fitRow(r.key, restRaw, rowMax);
          return (
            <text
              key={r.key || `__row_${i}`}
              x={NODE_PAD}
              y={rowY}
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
              fontSize={12}
            >
              {fit.key !== "" && (
                <tspan fill="var(--tok-key)">{fit.key}</tspan>
              )}
              {fit.rest !== "" && (
                <tspan
                  fill={isLink ? "var(--tok-punct)" : valueColor(r.valueType)}
                >
                  {fit.rest}
                </tspan>
              )}
            </text>
          );
        })}

        {/* Header click target — toggles node collapse */}
        {collapsible && (
          <rect
            width={node.width}
            height={HEADER_H}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onToggle(node.id)}
          />
        )}
      </g>
    </g>
  );
}

export const GraphNode = memo(GraphNodeImpl);
