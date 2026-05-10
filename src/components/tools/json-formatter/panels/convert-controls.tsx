"use client";

import { Button } from "@/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { formatBytes } from "../json-formatter.lib";
import type { JsonFormatterState } from "../use-json-formatter";
import { ArrowDownUp } from "lucide-react";

const BTN = "w-full justify-start gap-2 h-9 text-sm";

const S_GHOST: React.CSSProperties = {
  background: "var(--btn-ghost-bg)",
  color: "var(--btn-ghost-text)",
  borderColor: "var(--btn-ghost-border)",
};

type ConvertControlsProps = Pick<
  JsonFormatterState,
  "convert" | "conversionResult"
>;

export function ConvertControls({ convert, conversionResult }: ConvertControlsProps) {
  return (
    <>
      {/* Convert to */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className={BTN} style={S_GHOST}>
            <ArrowDownUp size={14} />
            Convert to
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuItem onClick={() => convert("csv")}>
            JSON &rarr; CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => convert("yaml")}>
            JSON &rarr; YAML
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => convert("typescript")}>
            JSON &rarr; TypeScript
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => convert("xml")}>
            JSON &rarr; XML
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => convert("zod")}>
            JSON &rarr; Zod
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => convert("csv-to-json")}>
            CSV &rarr; JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => convert("yaml-to-json")}>
            YAML &rarr; JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Conversion result info */}
      {conversionResult && (
        <div className="rounded-lg bg-brand/10 border border-brand/20 px-2 py-2 text-sm space-y-0.5">
          <p className="text-text-muted font-medium">
            Converted to {conversionResult.format.toUpperCase()}
          </p>
          <p className="text-text-faint">
            {formatBytes(conversionResult.size)}
          </p>
        </div>
      )}
    </>
  );
}
