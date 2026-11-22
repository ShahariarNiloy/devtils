"use client";

import { memo, useCallback, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { detectValueHint, type ValueHint } from "./value-detectors";
import { clipText, compactCount, DISPLAY_CHARS } from "./clip-text";

/**
 * Renders a primitive leaf value in the Tree view. Strings get an extra
 * smart-preview affordance — color swatch / data-URI thumbnail / open-link
 * icon / relative-time chip — depending on what `detectValueHint` says about
 * the value.
 *
 * Perf note: the detector is O(value.length) regex work. PrimitiveValue is
 * only re-rendered when its `value` prop changes, which only happens when
 * the document changes (TreeNode is memoized and stops the cascade).
 */

function PrimitiveValueImpl({ value }: { value: unknown }) {
  const handleCopy = useCallback(async () => {
    const text = value === null ? "null" : String(value);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch { /* ignore — clipboard unavailable */ }
  }, [value]);

  // Detect hints only for strings. useMemo means we pay the regex once per
  // mount/value-change, not on every parent re-render.
  const hint: ValueHint = useMemo(
    () => (typeof value === "string" ? detectValueHint(value) : null),
    [value],
  );

  if (value === null) {
    return (
      <span
        className="text-syntax-punctuation cursor-pointer hover:opacity-70 transition-opacity"
        onClick={handleCopy}
        title="Click to copy"
      >
        null
      </span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span
        className="text-syntax-boolean cursor-pointer hover:opacity-70 transition-opacity"
        onClick={handleCopy}
        title="Click to copy"
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span
        className="text-syntax-number cursor-pointer hover:opacity-70 transition-opacity"
        onClick={handleCopy}
        title="Click to copy"
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "string") {
    // Clip huge strings: laying out millions of characters in a row is what
    // freezes the page. Click still copies the whole value.
    const { text, rest } = clipText(value, DISPLAY_CHARS);
    return (
      <span className="inline-flex items-baseline gap-1.5 min-w-0">
        <span
          className="text-syntax-string cursor-pointer hover:opacity-70 transition-opacity break-all"
          onClick={handleCopy}
          title={rest ? `Click to copy all ${value.length.toLocaleString("en")} characters` : "Click to copy"}
        >
          {rest ? `"${text}…` : `"${text}"`}
          {rest > 0 && (
            <span className="ml-1.5 rounded bg-white/5 px-1.5 py-px font-sans text-[11px] whitespace-nowrap text-text-faint">
              +{compactCount(rest)} more chars
            </span>
          )}
        </span>
        {hint && <Hint hint={hint} />}
      </span>
    );
  }
  return <span className="text-text-muted">{String(value)}</span>;
}

// ── Hint chips ───────────────────────────────────────────────────────────────

function Hint({ hint }: { hint: NonNullable<ValueHint> }) {
  if (hint.kind === "color") return <ColorSwatch css={hint.css} />;
  if (hint.kind === "data-image") return <DataImageThumb src={hint.src} />;
  if (hint.kind === "url") return <UrlOpenIcon url={hint.url} host={hint.host} />;
  if (hint.kind === "date") return <DateChip relative={hint.relative} iso={hint.iso} />;
  return null;
}

function ColorSwatch({ css }: { css: string }) {
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded border border-border-subtle shrink-0 align-middle"
      style={{ background: css }}
      title={css}
      aria-label={`Color ${css}`}
    />
  );
}

function DataImageThumb({ src }: { src: string }) {
  // Data URIs are inline bytes — no network call, no LCP concern. Next's
  // <Image> would require dimensions ahead of time, which we don't have for
  // arbitrary user content.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="preview"
      className="inline-block h-5 w-auto max-w-[80px] rounded border border-border-subtle align-middle"
      style={{
        backgroundImage:
          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
      }}
    />
  );
}

function UrlOpenIcon({ url, host }: { url: string; host: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 rounded px-1 py-px text-text-faint hover:text-text hover:bg-surface-soft transition-colors shrink-0 align-middle"
      title={`Open ${host} in a new tab`}
    >
      <ExternalLink size={11} aria-hidden />
    </a>
  );
}

function DateChip({ relative, iso }: { relative: string; iso: string }) {
  return (
    <span
      className="inline-flex items-center rounded bg-surface-soft border border-border-subtle px-1.5 text-sm text-text-faint font-sans tracking-tight shrink-0 align-middle"
      title={iso}
    >
      {relative}
    </span>
  );
}

export const PrimitiveValue = memo(PrimitiveValueImpl);
