import type { TagTint } from "@/lib/blog/types";

/** Tag swatch backgrounds (design TINT map). Full class names for Tailwind. */
export const TINT_BG: Record<TagTint, string> = {
  teal: "bg-cat-teal",
  clay: "bg-cat-clay",
  sage: "bg-cat-sage",
  rose: "bg-cat-rose",
  plum: "bg-syntax-boolean",
  faint: "bg-text-faint",
};

export const TINT_TEXT: Record<TagTint, string> = {
  teal: "text-cat-teal",
  clay: "text-cat-clay",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
  plum: "text-syntax-boolean",
  faint: "text-text-faint",
};
