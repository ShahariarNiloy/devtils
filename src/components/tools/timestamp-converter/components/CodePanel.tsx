"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Temporal } from "@js-temporal/polyfill";
import { cn } from "@/lib/cn";
import {
  generateSnippet,
  tokenizeSnippet,
  type TokenType,
} from "../code-snippets";
import { SUPPORTED_LANGUAGES } from "../timestamp-converter.constants";
import type { ParseResult } from "../timestamp-converter.types";

const TOKEN_CLASS: Record<TokenType, string> = {
  comment: "text-text-muted italic",
  string: "text-sage-olive",
  number: "text-brand",
  keyword: "text-olive-ink font-medium",
  plain: "text-text",
};

interface Props {
  parseResult: ParseResult;
  primaryTz: string;
  activeLanguage: string;
  onLanguage: (id: string) => void;
}

export function CodePanel({
  parseResult,
  primaryTz,
  activeLanguage,
  onLanguage,
}: Props) {
  const [copied, setCopied] = useState(false);

  const instant =
    parseResult.ok && parseResult.instant
      ? parseResult.instant
      : Temporal.Now.instant();

  const snippet = useMemo(
    () => generateSnippet(activeLanguage, instant, primaryTz),
    [activeLanguage, instant, primaryTz],
  );
  const tokens = useMemo(() => {
    const raw = tokenizeSnippet(snippet, activeLanguage);
    const offsets = raw.reduce<number[]>(
      (acc, _t, i) =>
        acc.concat(i === 0 ? 0 : acc[i - 1] + raw[i - 1].text.length),
      [],
    );
    return raw.map((t, i) => ({ ...t, key: offsets[i] }));
  }, [snippet, activeLanguage]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      const lang =
        SUPPORTED_LANGUAGES.find((l) => l.id === activeLanguage)?.label ??
        activeLanguage;
      toast.success(`Copied ${lang} snippet`);
      setTimeout(() => setCopied(false), 1300);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border-subtle px-2 py-1.5">
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onLanguage(l.id)}
            aria-pressed={l.id === activeLanguage}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-sm font-medium transition-colors cursor-pointer",
              l.id === activeLanguage
                ? "bg-surface-soft text-text"
                : "text-text-muted hover:text-text",
            )}
          >
            {l.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy snippet"
          className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
        >
          {copied ? (
            <Check size={14} className="text-brand" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-text">
        <code>
          {tokens.map((t) => (
            <span key={t.key} className={TOKEN_CLASS[t.type]}>
              {t.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
