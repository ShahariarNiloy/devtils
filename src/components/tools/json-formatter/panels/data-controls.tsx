"use client";

import React, { useRef } from "react";
import { Button } from "@/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { SAMPLE_DATA } from "../json-formatter.lib";
import type { JsonFormatterState } from "../use-json-formatter";
import { BarChart2, Download, FileJson, Upload } from "lucide-react";

const BTN = "w-full justify-start gap-2 h-9 text-sm";

const S_UPLOAD: React.CSSProperties = {
  background: "var(--btn-upload-bg)",
  color: "var(--btn-upload-text)",
  borderColor: "var(--btn-upload-border)",
};

const S_GHOST: React.CSSProperties = {
  background: "var(--btn-ghost-bg)",
  color: "var(--btn-ghost-text)",
  borderColor: "var(--btn-ghost-border)",
};

type DataControlsProps = Pick<
  JsonFormatterState,
  "loadFile" | "downloadOutput" | "loadSample" | "showStats" | "setShowStats"
>;

export function DataControls({
  loadFile,
  downloadOutput,
  loadSample,
  showStats,
  setShowStats,
}: DataControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFile(file);
      e.target.value = "";
    }
  };

  return (
    <>
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
        className={BTN}
        style={S_UPLOAD}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={14} />
        Upload Data
      </Button>

      <div className="my-0.5 h-px bg-border-subtle" />

      {/* Download */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className={BTN} style={S_GHOST}>
            <Download size={14} />
            Download
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuItem onClick={() => downloadOutput("json")}>
            .json
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadOutput("yaml")}>
            .yaml
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadOutput("csv")}>
            .csv
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadOutput("txt")}>
            .txt
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Stats toggle */}
      <Button
        variant="secondary"
        size="sm"
        className={BTN}
        style={S_GHOST}
        onClick={() => setShowStats(!showStats)}
      >
        <BarChart2 size={14} />
        Stats
      </Button>

      {/* Sample data */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className={BTN} style={S_GHOST}>
            <FileJson size={14} />
            Sample
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          {Object.entries(SAMPLE_DATA).map(([key, { label }]) => (
            <DropdownMenuItem key={key} onClick={() => loadSample(key)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
