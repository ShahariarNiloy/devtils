"use client";

import { useDeferredValue, useState } from "react";
import type { Tool } from "@/lib/tools-registry";
import { MobileAppBar } from './mobile-app-bar';
import { MobileTabBar } from './mobile-tab-bar';
import { StickyPatternBar } from './sticky-pattern-bar';
import { EditorView } from './views/editor-view';
import { ExplainView } from './views/explain-view';
import { PatternsDialog } from './dialogs/patterns-dialog';
import { CheatsheetDialog } from './dialogs/cheatsheet-dialog';
import { ExamplesSheet } from './dialogs/examples-sheet';
import type { MobileState } from "./types";

interface MobileRegexTesterProps {
  tool: Tool;
  state: MobileState;
}

export function MobileRegexTester({ tool, state }: MobileRegexTesterProps) {
  const [patternsOpen, setPatternsOpen]     = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [samplesOpen, setSamplesOpen]       = useState(false);

  const deferredView = useDeferredValue(state.activeView);

  return (
    <>
      <div className="flex flex-col pb-28">
        <MobileAppBar
          title={tool.name}
          state={state}
          onOpenPatterns={() => setPatternsOpen(true)}
          onOpenCheatsheet={() => setCheatsheetOpen(true)}
          onOpenSamples={() => setSamplesOpen(true)}
        />
        <StickyPatternBar
          state={state}
          onOpenSamples={() => setSamplesOpen(true)}
        />

        <div className="flex-1 min-h-0">
          {deferredView === "editor"  && <EditorView  state={state} />}
          {deferredView === "explain" && <ExplainView state={state} />}
        </div>

        <MobileTabBar state={state} />
      </div>

      <PatternsDialog   open={patternsOpen}   onOpenChange={setPatternsOpen}   state={state} />
      <CheatsheetDialog open={cheatsheetOpen} onOpenChange={setCheatsheetOpen} />
      <ExamplesSheet    open={samplesOpen}    onOpenChange={setSamplesOpen}    state={state} />
    </>
  );
}
