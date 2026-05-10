"use client";

import { cn } from "@/lib/cn";
import { Textarea } from '@/components/primitives/textarea';
import { TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useEditorView } from "../hooks/use-editor-view";
import { MatchPanel, ReplacePanel, SplitPanel, ExtractPanel } from "./editor-panels";
import type { MobileState } from "../types";

interface EditorViewProps {
  state: MobileState;
}

export function EditorView({ state }: EditorViewProps) {
  const { text, setText, mode, highlighted, setSelectedMatch } = state;
  const { marksPreRef, syncScroll } = useEditorView();

  return (
    <div className="flex flex-col">

      {/* Mode strip — text-sm + tighter padding to fit Replace/Extract on phones */}
      <div className="px-3 pt-3 pb-2 bg-bg">
        <TabsList className="w-full grid grid-cols-4 h-11">
          <TabsTrigger value="match"   className="text-sm px-2">Match</TabsTrigger>
          <TabsTrigger value="replace" className="text-sm px-2">Replace</TabsTrigger>
          <TabsTrigger value="split"   className="text-sm px-2">Split</TabsTrigger>
          <TabsTrigger value="extract" className="text-sm px-2">Extract</TabsTrigger>
        </TabsList>
      </div>

      {/* Editor — textarea on top, match backgrounds underneath */}
      <div className="relative border-t border-b border-border-subtle bg-surface min-h-72">
        <pre
          ref={marksPreRef}
          aria-hidden
          className="absolute inset-0 m-0 px-3.5 py-3 font-mono text-base leading-relaxed text-transparent whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden"
        >
          {highlighted}
        </pre>
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSelectedMatch(null); }}
          onScroll={(e) => syncScroll(e.currentTarget.scrollTop)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className={cn(
            "absolute inset-0 border-0 rounded-none bg-transparent caret-text resize-none",
            "font-mono text-base leading-relaxed px-3.5 py-3 text-text regex-highlighted",
          )}
          placeholder="Paste or type test text…"
          aria-label="Test string"
        />
      </div>

      {/* Mode-specific results panel */}
      {mode === "match"   && <MatchPanel   state={state} />}
      {mode === "replace" && <ReplacePanel state={state} />}
      {mode === "split"   && <SplitPanel   state={state} />}
      {mode === "extract" && <ExtractPanel state={state} />}
    </div>
  );
}
