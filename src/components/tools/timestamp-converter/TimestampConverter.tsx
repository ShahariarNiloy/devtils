"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useTimestampConverter } from "./useTimestampConverter";
import { HeroInput } from "./components/HeroInput";
import { ModeTabs } from "./components/ModeTabs";
import { StatusBar } from "./components/StatusBar";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import { SingleMode } from "./modes/SingleMode";
import { CompareMode } from "./modes/CompareMode";
import { ArithmeticMode } from "./modes/ArithmeticMode";
import { BatchMode } from "./modes/BatchMode";
import type { ToolMode } from "./timestamp-converter.types";

export function TimestampConverter({ tool }: { tool: Tool }) {
  const s = useTimestampConverter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // shortcut: ⌘ K — focus the hero input
  useShortcut({ key: "k", meta: true }, (e) => {
    e.preventDefault();
    inputRef.current?.focus();
  });
  // shortcut: ⌘ Enter — insert current timestamp
  useShortcut({ key: "enter", meta: true }, (e) => {
    e.preventDefault();
    s.useNow();
  });
  // shortcut: ⌘ ⇧ T — swap primary / secondary timezones
  useShortcut({ key: "t", meta: true, shift: true }, (e) => {
    e.preventDefault();
    s.swapTimezones();
  });
  // shortcut: ⌘ L — copy permalink
  useShortcut({ key: "l", meta: true }, (e) => {
    e.preventDefault();
    void s.copyPermalink().then(() => toast.success("Permalink copied"));
  });
  // shortcut: ⌘ C — copy primary ISO 8601 when no text is selected
  useShortcut({ key: "c", meta: true }, () => {
    if (window.getSelection()?.toString()) return;
    if (!s.formats) return;
    void navigator.clipboard
      .writeText(s.formats.iso8601Primary)
      .then(() => toast.success("Copied ISO 8601"));
  });
  // shortcut: Esc — clear input (also when the input is focused)
  useShortcut({ key: "escape", ignoreInEditable: false }, () => s.clear());
  // shortcut: ? — toggle the shortcuts overlay
  useShortcut({ key: "?" }, (e) => {
    e.preventDefault();
    setHelpOpen((o) => !o);
  });
  // shortcut: ⌘ 1-4 — switch mode (Single / Compare / Arithmetic / Batch)
  const MODES: ToolMode[] = ["single", "compare", "arithmetic", "batch"];
  useShortcut({ key: "1", meta: true }, (e) => {
    e.preventDefault();
    s.setMode(MODES[0]);
  });
  useShortcut({ key: "2", meta: true }, (e) => {
    e.preventDefault();
    s.setMode(MODES[1]);
  });
  useShortcut({ key: "3", meta: true }, (e) => {
    e.preventDefault();
    s.setMode(MODES[2]);
  });
  useShortcut({ key: "4", meta: true }, (e) => {
    e.preventDefault();
    s.setMode(MODES[3]);
  });

  return (
    <ToolShell tool={tool}>
      <div id="main-content" className="flex flex-col gap-10">

        <div className="mx-auto w-full max-w-3xl">
          <HeroInput
            ref={inputRef}
            value={s.rawInput}
            onChange={s.setRawInput}
            onUseNow={s.useNow}
            onClear={s.clear}
            onOverride={s.overrideFormat}
            parseResult={s.parseResult}
            primaryTz={s.primaryTz}
            nowUnix={s.nowUnix}
          />
        </div>

        <ModeTabs mode={s.mode} onMode={s.setMode} />

        {s.mode === "single" && <SingleMode s={s} />}
        {s.mode === "compare" && <CompareMode s={s} />}
        {s.mode === "arithmetic" && <ArithmeticMode s={s} />}
        {s.mode === "batch" && <BatchMode />}

        <StatusBar dstWarning={s.dstWarning} />
      </div>

      <ShortcutsOverlay open={helpOpen} onOpenChange={setHelpOpen} />
    </ToolShell>
  );
}
