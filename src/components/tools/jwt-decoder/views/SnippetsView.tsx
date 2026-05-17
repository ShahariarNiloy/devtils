"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  SNIPPET_LABELS,
  SNIPPET_LANGUAGES,
  generateSnippet,
} from "../jwt-snippets";
import type { ParsedJwt, SnippetLanguage } from "../jwt-decoder.types";

export function SnippetsView({ jwt }: { jwt: ParsedJwt }) {
  const [lang, setLang] = useState<SnippetLanguage>("node-jsonwebtoken");
  const code = useMemo(() => generateSnippet(jwt, lang), [jwt, lang]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {SNIPPET_LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              l === lang
                ? "bg-surface-soft text-text"
                : "text-text-faint hover:bg-surface-soft hover:text-text",
            )}
          >
            {SNIPPET_LABELS[l]}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Copy snippet"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            toast.success("Snippet copied");
          }}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-surface-soft hover:text-text"
        >
          <Copy size={13} />
        </button>
        <pre className="overflow-auto rounded-lg border border-border bg-bg p-3 pr-10 font-mono text-base leading-relaxed text-text">
          {code}
        </pre>
      </div>
    </div>
  );
}
