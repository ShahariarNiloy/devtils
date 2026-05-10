"use client";

import { ListChecks } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { PatternsDialog } from "./patterns-dialog";
import { CheatsheetDialog } from "./cheatsheet-dialog";
import type { PatternCategory } from "../regex.lib";

interface ToolbarRowProps {
  patternsOpen: boolean;
  setPatternsOpen: (v: boolean) => void;
  patternSearch: string;
  setPatternSearch: (v: string) => void;
  filteredLibrary: PatternCategory[];
  setPattern: (v: string) => void;
  setFlags: (v: string[]) => void;
  setSelectedMatch: (v: number | null) => void;
  showExamples: boolean;
  setShowExamples: React.Dispatch<React.SetStateAction<boolean>>;
  scrollToBreakdown: () => void;
}

export function ToolbarRow({
  patternsOpen,
  setPatternsOpen,
  patternSearch,
  setPatternSearch,
  filteredLibrary,
  setPattern,
  setFlags,
  setSelectedMatch,
  showExamples,
  setShowExamples,
  scrollToBreakdown,
}: ToolbarRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <TabsList>
        <TabsTrigger value="match">Match</TabsTrigger>
        <TabsTrigger value="replace">Replace</TabsTrigger>
        <TabsTrigger value="split">Split</TabsTrigger>
        <TabsTrigger value="extract">Extract</TabsTrigger>
      </TabsList>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <PatternsDialog
          patternsOpen={patternsOpen}
          setPatternsOpen={setPatternsOpen}
          patternSearch={patternSearch}
          setPatternSearch={setPatternSearch}
          filteredLibrary={filteredLibrary}
          setPattern={setPattern}
          setFlags={setFlags}
          setSelectedMatch={setSelectedMatch}
        />

        <CheatsheetDialog />

        <Button
          variant="secondary"
          size="sm"
          onClick={scrollToBreakdown}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v18" />
            <path d="M3 12h18" />
            <path d="m18 6-12 12" />
            <path d="m6 6 12 12" />
          </svg>
          Explain
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-border-subtle mx-1" />

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowExamples((v) => !v)}
          className={showExamples ? "ring-2 ring-brand/30" : ""}
        >
          <ListChecks size={15} />
          Sample matches
        </Button>
      </div>
    </div>
  );
}
