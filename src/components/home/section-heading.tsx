import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";

export interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  hint?: React.ReactNode;
  cta?: { href: string; label: string };
}

export function SectionHeading({ eyebrow, title, hint, cta }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-eyebrow text-text-faint">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-sage-olive)" }}
            aria-hidden
          />
          {eyebrow}
        </span>
        <h2 className="display mt-2 text-h2 sm:text-page font-semibold tracking-tight text-text">
          {title}
        </h2>
        {hint && <p className="mt-1.5 text-sm text-text-faint">{hint}</p>}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted transition-colors hover:text-text"
        >
          {cta.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
