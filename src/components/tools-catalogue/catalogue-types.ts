/** Client-safe constants for the catalogue (no registry imports). */

export type Task = "format" | "convert" | "encode" | "generate" | "compare" | "inspect";

export const TASKS: { id: Task | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "format", label: "Format" },
  { id: "convert", label: "Convert" },
  { id: "encode", label: "Encode" },
  { id: "generate", label: "Generate" },
  { id: "compare", label: "Compare" },
  { id: "inspect", label: "Inspect" },
];
