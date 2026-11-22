"use client";

import { LazyCodeEditor } from "@/components/primitives/code-editor";
import { toCodeEditorProps, type JsonEditorProps } from "./json-editor";

/** The formatter's editor — the shared lazy CodeMirror editor in JSON mode. */
export function LazyJsonEditor(props: JsonEditorProps) {
  return <LazyCodeEditor {...toCodeEditorProps(props)} />;
}
