"use client";

import { lazy, Suspense } from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_HOST_CLASS, DEFAULT_LINE_HEIGHT, DEFAULT_PADDING, GUTTER_PLACEHOLDER_PAD, type CodeEditorProps } from "./types";

const CodeEditor = lazy(() => import("./code-editor"));

/** Show at most this much text in the pre-load placeholder (it's on screen for a few ms). */
const PREVIEW_CHARS = 20_000;

/**
 * The shared code editor, with CodeMirror in its own chunk so it never
 * delays first paint. Until it mounts, the pane shows a static look-alike
 * (same font, line height, padding and gutter width), so there's no layout
 * shift when the editor takes over.
 */
export function LazyCodeEditor(props: CodeEditorProps) {
  const { value, lineNumbers = true, lineHeight = DEFAULT_LINE_HEIGHT, padding = DEFAULT_PADDING, className = DEFAULT_HOST_CLASS } = props;
  // With a gutter, the text starts after the line numbers (paddingLeft below).
  const hint = props.onChange ? props.placeholder : props.emptyText;
  return (
    <Suspense
      fallback={
        <pre
          className={cn("m-0 overflow-hidden font-mono text-syntax-plain", props.wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre", className)}
          style={{ lineHeight, padding, paddingLeft: lineNumbers ? GUTTER_PLACEHOLDER_PAD : undefined }}
        >
          {value ? value.slice(0, PREVIEW_CHARS) : hint && <span className="text-text-faint">{hint}</span>}
        </pre>
      }
    >
      <CodeEditor {...props} />
    </Suspense>
  );
}
