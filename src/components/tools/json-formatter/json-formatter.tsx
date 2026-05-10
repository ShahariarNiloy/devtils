"use client";

import { ToolShell } from '@/components/layout/tool-shell';
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { ActionColumn } from './panels/action-column';
import { InputPanel } from './panels/input-panel';
import { OutputPanel } from './panels/output-panel';
import { QueryPanel } from './panels/query-panel';
import { StatsPanel } from './panels/stats-panel';
import { useJsonFormatter } from "./use-json-formatter";

export function JsonFormatter({ tool }: { tool: Tool }) {
  const state = useJsonFormatter();

  useShortcut({ key: "Enter", meta: true }, (e) => {
    e.preventDefault();
    state.format();
  });
  useShortcut({ key: "m", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.minify();
  });
  useShortcut({ key: "v", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.validate();
  });
  useShortcut({ key: "c", meta: true, shift: true }, (e) => {
    e.preventDefault();
    void state.copyOutput();
  });
  useShortcut({ key: "r", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.repair();
  });
  useShortcut({ key: "s", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.sortKeys("asc");
  });
  useShortcut({ key: "d", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.downloadOutput("json");
  });

  return (
    <ToolShell tool={tool} classNames={{ body: "max-w-auto" }}>
      <div className="flex flex-col gap-4">
        {/* Three-column editor panel.
            Height is viewport-relative so the tree view has real room to breathe
            on larger screens while staying usable on smaller ones.
            min-h keeps it from becoming unusably short. */}
        <div
          className="flex overflow-hidden rounded-xl border border-border shadow-card"
          style={{ height: "max(520px, calc(100dvh - var(--spacing-header)))" }}
        >
          <InputPanel state={state} />
          <ActionColumn state={state} />
          <OutputPanel state={state} />
        </div>

        {/* Stats panel — inline below formatter */}
        {state.showStats && state.stats && (
          <StatsPanel
            stats={state.stats}
            onClose={() => state.setShowStats(false)}
          />
        )}

        {/* JSONPath query panel — inline below formatter */}
        {state.showQuery && <QueryPanel state={state} />}
      </div>
    </ToolShell>
  );
}
