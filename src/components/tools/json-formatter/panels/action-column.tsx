"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";
import type { JsonFormatterState } from "../use-json-formatter";
import { DataControls } from "./data-controls";
import { FormatControls } from "./format-controls";
import { ConvertControls } from "./convert-controls";
import { RepairControls } from "./repair-controls";

interface ActionColumnProps {
  state: JsonFormatterState;
}

export function ActionColumn({ state }: ActionColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 border-l border-r border-border bg-surface-soft overflow-y-auto shrink-0 w-[220px]",
        isDragOver && "ring-2 ring-inset ring-border-strong"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DataControls
        loadFile={state.loadFile}
        downloadOutput={state.downloadOutput}
        loadSample={state.loadSample}
        showStats={state.showStats}
        setShowStats={state.setShowStats}
      />

      <FormatControls
        format={state.format}
        minify={state.minify}
        indent={state.indent}
        setIndent={state.setIndent}
        sortKeys={state.sortKeys}
        minifyStats={state.minifyStats}
        setShowStats={state.setShowStats}
        restoreFromMinify={state.restoreFromMinify}
      />

      <ConvertControls
        convert={state.convert}
        conversionResult={state.conversionResult}
      />

      <RepairControls
        repair={state.repair}
        repairLog={state.repairLog}
        repairError={state.repairError}
      />
    </div>
  );
}
