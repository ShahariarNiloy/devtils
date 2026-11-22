import type { CodeEditorProps } from "@/components/primitives/code-editor";
import type { IndentStyle } from "../json-formatter.types";

/**
 * The formatter's input / JSON output editor: the shared code editor
 * (`@/components/primitives/code-editor`) in JSON mode with the
 * formatter's defaults. Typed here so the panels keep their `indent` prop.
 */
export interface JsonEditorProps extends Omit<CodeEditorProps, "language" | "indentUnit"> {
  indent: IndentStyle;
}

export const indentString = (indent: IndentStyle) => (indent === "tab" ? "\t" : " ".repeat(Number(indent)));

export function toCodeEditorProps({ indent, ...rest }: JsonEditorProps): CodeEditorProps {
  const readOnly = rest.onChange === undefined;
  return {
    placeholder: "Paste JSON here…",
    emptyText: "Output will appear here.",
    ariaLabel: readOnly ? "Output" : "JSON input",
    ...rest,
    language: "json",
    indentUnit: indentString(indent),
  };
}
