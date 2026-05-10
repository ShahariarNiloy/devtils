"use client";

import { Button } from "@/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { formatBytes } from "../json-formatter.lib";
import type { IndentStyle } from "../json-formatter.types";
import type { JsonFormatterState } from "../use-json-formatter";
import { AlignLeft, ArrowUpAZ, Minimize2, X } from "lucide-react";

const BTN = "w-full justify-start gap-2 h-9 text-sm";

const S_FORMAT: React.CSSProperties = {
  background: "var(--btn-format-bg)",
  color: "var(--btn-format-text)",
  borderColor: "var(--btn-format-border)",
};

const S_GHOST: React.CSSProperties = {
  background: "var(--btn-ghost-bg)",
  color: "var(--btn-ghost-text)",
  borderColor: "var(--btn-ghost-border)",
};

type FormatControlsProps = Pick<
  JsonFormatterState,
  | "format"
  | "minify"
  | "indent"
  | "setIndent"
  | "sortKeys"
  | "minifyStats"
  | "setShowStats"
  | "restoreFromMinify"
>;

export function FormatControls({
  format,
  minify,
  indent,
  setIndent,
  sortKeys,
  minifyStats,
  setShowStats,
  restoreFromMinify,
}: FormatControlsProps) {
  return (
    <>
      {/* Format / Beautify */}
      <Button
        variant="secondary"
        size="sm"
        className={BTN}
        style={S_FORMAT}
        onClick={format}
      >
        <AlignLeft size={14} />
        Format
      </Button>

      {/* Minify / Compact */}
      <Button
        variant="secondary"
        size="sm"
        className={BTN}
        style={S_GHOST}
        onClick={minify}
      >
        <Minimize2 size={14} />
        Minify
      </Button>

      {/* Indent selector */}
      <Select
        value={indent}
        onValueChange={(v) => setIndent(v as IndentStyle)}
      >
        <SelectTrigger size="sm" className="w-full h-9" style={S_GHOST}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2">2 spaces</SelectItem>
          <SelectItem value="4">4 spaces</SelectItem>
          <SelectItem value="tab">Tab</SelectItem>
        </SelectContent>
      </Select>

      {/* Minify stats */}
      {minifyStats && (
        <div className="rounded-lg bg-success/10 border border-success/20 px-2 py-2 text-sm text-success space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="font-medium">&#x2713; Minified</span>
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="text-text-faint hover:text-text transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          <p>
            {formatBytes(minifyStats.before)} &rarr;{" "}
            {formatBytes(minifyStats.after)}{" "}
            <span className="opacity-70">(saved {minifyStats.savedPct}%)</span>
          </p>
          <button
            type="button"
            onClick={restoreFromMinify}
            className="text-sm underline text-success/80 hover:text-success transition-colors"
          >
            Restore
          </button>
        </div>
      )}

      <div className="my-0.5 h-px bg-border-subtle" />

      {/* Sort keys */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className={BTN} style={S_GHOST}>
            <ArrowUpAZ size={14} />
            Sort keys
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuItem onClick={() => sortKeys("asc")}>
            A &rarr; Z
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => sortKeys("desc")}>
            Z &rarr; A
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => sortKeys("none")}>
            Remove sort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
