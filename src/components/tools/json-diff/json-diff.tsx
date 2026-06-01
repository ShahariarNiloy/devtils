"use client";

import { Link2 } from "lucide-react";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/primitives/tabs";
import type { Tool } from "@/lib/tools-registry";
import { JsonDiffContent } from "./content";
import { ControlsBar } from "./panels/controls-bar";
import { InputPanel } from "./panels/input-panel";
import { PatchView } from "./panels/patch-view";
import { ResultTree } from "./panels/result-tree";
import { SideBySideView } from "./panels/side-by-side-view";
import { useJsonDiff, type ResultView } from "./use-json-diff";

/**
 * JSON diff — top-level shell. Two-pane input + controls bar + result
 * tabs (Tree / Patch / Side-by-side). All state lives in `useJsonDiff`;
 * panels are presentational.
 */
export function JsonDiff({ tool }: { tool: Tool }) {
  const s = useJsonDiff();

  return (
    <ToolShell tool={tool}>
      <div className="flex flex-col gap-4 px-4 sm:px-0">
        {/* Header: load-sample + share */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={s.loadSample}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs-plus font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Load sample
            </button>
            <button
              type="button"
              onClick={s.clear}
              disabled={!s.left && !s.right}
              className="inline-flex h-8 items-center rounded-md px-2.5 text-xs-plus text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
            >
              Clear both
            </button>
          </div>
          <button
            type="button"
            onClick={s.copyShareLink}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs-plus text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Copy share link"
          >
            <Link2 size={12} />
            Share
          </button>
        </div>

        {/* Two-pane input */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="h-[420px]">
            <InputPanel
              label="Left"
              value={s.left}
              onChange={s.setLeft}
              parse={s.leftParse}
            />
          </div>
          <div className="h-[420px]">
            <InputPanel
              label="Right"
              value={s.right}
              onChange={s.setRight}
              parse={s.rightParse}
            />
          </div>
        </div>

        {/* Controls */}
        <ControlsBar
          result={s.result}
          arrayStrategy={s.arrayStrategy}
          onArrayStrategy={s.setArrayStrategy}
          identityKey={s.identityKey}
          onIdentityKey={s.setIdentityKey}
          sortKeys={s.sortKeys}
          onSortKeys={s.setSortKeys}
          hideUnchanged={s.hideUnchanged}
          onHideUnchanged={s.setHideUnchanged}
          pointerStyle={s.pointerStyle}
          onPointerStyle={s.setPointerStyle}
          onSwap={s.swap}
        />

        {/* Result view tabs */}
        <Tabs
          value={s.view}
          onValueChange={(v) => s.setView(v as ResultView)}
          className="flex flex-col gap-3"
        >
          <TabsList>
            <TabsTrigger value="tree">Tree</TabsTrigger>
            <TabsTrigger value="patch">JSON Patch</TabsTrigger>
            <TabsTrigger value="side-by-side">Side-by-side</TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="mt-0">
            <ResultTree result={s.result} pointerStyle={s.pointerStyle} />
          </TabsContent>

          <TabsContent value="patch" className="mt-0">
            <PatchView patch={s.patch} />
          </TabsContent>

          <TabsContent value="side-by-side" className="mt-0">
            <SideBySideView
              leftValue={s.leftParse.value}
              rightValue={s.rightParse.value}
              sortKeys={s.sortKeys}
              hideUnchanged={s.hideUnchanged}
            />
          </TabsContent>
        </Tabs>

        <JsonDiffContent />
      </div>
    </ToolShell>
  );
}
