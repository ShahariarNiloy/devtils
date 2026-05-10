"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Tooltip } from '@/components/primitives/tooltip';
import { CHARSETS } from "../base64.lib";
import type { Charset } from "../base64.types";

const CHARSET_TIPS: Record<Charset, string> = {
  "utf-8":   "Default. Handles emoji and non-Latin text correctly.",
  "latin-1": "Single-byte (ISO-8859-1). Older systems and some HTTP headers.",
  "ascii":   "Only 7-bit ASCII characters. Anything else becomes ?.",
};

interface CharsetSelectorProps {
  value: Charset;
  onChange: (c: Charset) => void;
}

export function CharsetSelector({ value, onChange }: CharsetSelectorProps) {
  const label = CHARSETS.find((c) => c.value === value)?.label ?? "UTF-8";
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm font-medium text-text-faint">Charset</span>
      <DropdownMenu>
        <Tooltip content="Text encoding for the plain-text side. UTF-8 is correct for almost everything." side="bottom">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Charset: ${label}`}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-button border border-border bg-surface-2 text-sm text-text-muted hover:border-border-strong hover:text-text transition-colors cursor-pointer"
            >
              <span>{label}</span>
              <ChevronDown size={14} aria-hidden />
            </button>
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-64">
          {CHARSETS.map((c) => (
            <DropdownMenuItem
              key={c.value}
              onSelect={() => onChange(c.value)}
              className="flex flex-col items-start gap-0.5 py-2"
            >
              <span className="text-sm font-medium text-text">{c.label}</span>
              <span className="text-sm text-text-faint">{CHARSET_TIPS[c.value]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
