"use client";

import { Hash, Link2, Mail, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Base64Variant } from "../base64.types";

const OPTIONS: { value: Base64Variant; label: string; tip: string; icon: LucideIcon }[] = [
  {
    value: "standard",
    label: "Standard",
    tip: "Default. Uses + / characters.",
    icon: Hash,
  },
  {
    value: "url-safe",
    label: "URL-safe",
    tip: "For URLs, JWTs, and filenames. Uses - and _ instead of + and /, drops trailing = padding.",
    icon: Link2,
  },
  {
    value: "mime",
    label: "MIME",
    tip: "For email bodies. Same alphabet as Standard, but wraps a line every 76 characters.",
    icon: Mail,
  },
  {
    value: "pem",
    label: "PEM",
    tip: "For TLS certificates and keys. Same alphabet as Standard, wrapped every 64 characters.",
    icon: ShieldCheck,
  },
];

interface VariantSelectorProps {
  value: Base64Variant;
  onChange: (v: Base64Variant) => void;
}

export function VariantSelector({ value, onChange }: VariantSelectorProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm font-medium text-text-faint">Variant</span>
      <div
        role="radiogroup"
        aria-label="Base64 variant"
        className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1"
      >
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              title={o.tip}
              aria-label={`${o.label}: ${o.tip}`}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-sans transition-colors cursor-pointer",
                active
                  ? "bg-surface-soft text-text font-medium"
                  : "text-text-muted hover:text-text",
              )}
            >
              <Icon size={13} aria-hidden />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
