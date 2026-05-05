"use client";

import { useRef, useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlignLeft,
  Minimize2,
  ArrowDownUp,
  RefreshCcw,
  Layers,
  Download,
  BarChart2,
  FileJson,
  X,
  ArrowUpAZ,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/primitives/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/DropdownMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/Select";
import type { JsonFormatterState } from "../useJsonFormatter";
import type { IndentStyle } from "../json-formatter.types";
import { SAMPLE_DATA, formatBytes } from "../json-formatter.lib";

interface ActionColumnProps {
  state: JsonFormatterState;
}

export function ActionColumn({ state }: ActionColumnProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.loadFile(file);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) state.loadFile(file);
  };

  const validationState = state.validation;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 border-l border-r border-border bg-surface-soft overflow-y-auto shrink-0 w-[220px]",
        isDragOver && "ring-2 ring-inset ring-border-strong",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,.csv"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Upload Data */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={13} />
        Upload Data
      </Button>

      <div className="my-0.5 h-px bg-border-subtle" />

      {/* Validate */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={state.validate}
      >
        <CheckCircle2 size={13} />
        Validate
      </Button>

      {/* Validation status */}
      {validationState.status === "valid" && (
        <p className="text-sm text-success font-medium px-1">
          ✓ Valid
        </p>
      )}
      {validationState.status === "invalid" && (
        <p className="text-sm text-danger px-1">
          ✕ line {validationState.line}, col {validationState.col}
        </p>
      )}

      {/* Indent selector */}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-text-faint px-1">Indent</span>
        <Select
          value={state.indent}
          onValueChange={(v) => state.setIndent(v as IndentStyle)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 spaces</SelectItem>
            <SelectItem value="4">4 spaces</SelectItem>
            <SelectItem value="tab">Tab</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Format / Beautify */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={state.format}
      >
        <AlignLeft size={13} />
        Format
      </Button>

      {/* Minify / Compact */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={state.minify}
      >
        <Minimize2 size={13} />
        Minify
      </Button>

      {/* Minify stats bar */}
      {state.minifyStats && (
        <div className="rounded-lg bg-success/10 border border-success/20 px-2 py-2 text-sm text-success space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="font-medium">✓ Minified</span>
            <button
              type="button"
              onClick={() => state.setShowStats(false)}
              className="text-text-faint hover:text-text transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          <p>
            {formatBytes(state.minifyStats.before)} → {formatBytes(state.minifyStats.after)}{" "}
            <span className="opacity-70">(saved {state.minifyStats.savedPct}%)</span>
          </p>
          <button
            type="button"
            onClick={state.restoreFromMinify}
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
          <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
            <ArrowUpAZ size={13} />
            Sort keys
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => state.sortKeys("asc")}>
            A → Z
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.sortKeys("desc")}>
            Z → A
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => state.sortKeys("none")}>
            Remove sort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Convert to */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
            <ArrowDownUp size={13} />
            Convert to
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => state.convert("csv")}>JSON → CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.convert("yaml")}>JSON → YAML</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.convert("typescript")}>JSON → TypeScript</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.convert("xml")}>JSON → XML</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.convert("zod")}>JSON → Zod</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => state.convert("csv-to-json")}>CSV → JSON</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.convert("yaml-to-json")}>YAML → JSON</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Repair / Fix */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={state.repair}
      >
        <RefreshCcw size={13} />
        Repair / Fix
      </Button>

      {/* Repair log */}
      {state.repairLog.length > 0 && (
        <div className="rounded-lg bg-success/10 border border-success/20 px-2 py-2 text-sm text-success space-y-1">
          <p className="font-medium">✓ Fixed {state.repairLog.length} issue{state.repairLog.length !== 1 ? "s" : ""}:</p>
          <ul className="space-y-0.5 pl-1">
            {state.repairLog.map((item, i) => (
              <li key={i} className="text-text-muted">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Repair error */}
      {state.repairError && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-2 py-2 text-sm text-danger">
          {state.repairError}
        </div>
      )}

      {/* Remove duplicates */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={state.deduplicate}
      >
        <Layers size={13} />
        Remove dupes
      </Button>

      <div className="my-0.5 h-px bg-border-subtle" />

      {/* Download */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
            <Download size={13} />
            Download
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => state.downloadOutput("json")}>.json</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.downloadOutput("yaml")}>.yaml</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.downloadOutput("csv")}>.csv</DropdownMenuItem>
          <DropdownMenuItem onClick={() => state.downloadOutput("txt")}>.txt</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Stats toggle */}
      <Button
        variant={state.showStats ? "primary" : "secondary"}
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => state.setShowStats(!state.showStats)}
      >
        <BarChart2 size={13} />
        Stats
      </Button>

      {/* Sample data */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
            <FileJson size={13} />
            Sample
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          {Object.entries(SAMPLE_DATA).map(([key, { label }]) => (
            <DropdownMenuItem key={key} onClick={() => state.loadSample(key)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Conversion result info */}
      {state.conversionResult && (
        <div className="rounded-lg bg-brand/10 border border-brand/20 px-2 py-2 text-sm space-y-0.5">
          <p className="text-text-muted font-medium">
            Converted to {state.conversionResult.format.toUpperCase()}
          </p>
          <p className="text-text-faint">{formatBytes(state.conversionResult.size)}</p>
        </div>
      )}
    </div>
  );
}
