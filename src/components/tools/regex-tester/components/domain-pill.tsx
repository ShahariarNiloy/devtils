"use client";

import { cn } from "@/lib/cn";
import type { PatternDomain } from "../realistic-generator";

const LABELS: Record<PatternDomain, string> = {
  email:       "EMAIL",
  url:         "URL",
  ipv4:        "IPV4",
  ipv6:        "IPV6",
  uuid:        "UUID",
  "hex-color": "HEX",
  date:        "DATE",
  time:        "TIME",
  phone:       "PHONE",
  slug:        "SLUG",
  price:       "PRICE",
  semver:      "SEMVER",
  mac:         "MAC",
  jwt:         "JWT",
  base64:      "BASE64",
  generic:     "GENERIC",
};

export function DomainPill({ domain }: { domain: PatternDomain }) {
  return (
    <span
      className={cn(
        "font-mono text-sm tracking-[0.1em] uppercase",
        "rounded px-2 py-0.5 inline-block",
        domain === "generic"
          ? "bg-surface-soft text-text-faint"
          : "bg-[var(--color-token-anchor-bg)] text-[var(--color-token-anchor-text)]",
      )}
    >
      {LABELS[domain]}
    </span>
  );
}
