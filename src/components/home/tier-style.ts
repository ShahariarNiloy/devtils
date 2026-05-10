import type { Tool } from "@/lib/tools-registry";

export const TIER_STYLE: Record<
  Tool["tier"],
  { label: string; bg: string; color: string }
> = {
  free: {
    label: "Free",
    bg: "var(--color-tier-free-bg)",
    color: "var(--color-tier-free-text)",
  },
  pro: {
    label: "Pro",
    bg: "var(--color-tier-pro-bg)",
    color: "var(--color-tier-pro-text)",
  },
  ai: {
    label: "AI",
    bg: "var(--color-tier-ai-bg)",
    color: "var(--color-tier-ai-text)",
  },
};
