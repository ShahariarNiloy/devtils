import type { ReactNode } from "react";
import type { Compiled, RegexMatch, explainPattern } from "../regex.lib";

type ExplainToken = ReturnType<typeof explainPattern>[number];

export type MobileView = "editor" | "explain";

/**
 * Shared state passed from RegexTester down through the mobile shell.
 * Mirrors the same state the desktop layout uses; mobile components stay
 * stateless and read from this object.
 */
export interface MobileState {
  // ── Inputs ──────────────────────────────────────────────────
  pattern: string;
  setPattern: (s: string) => void;
  flags: string[];
  setFlags: (f: string[]) => void;
  text: string;
  setText: (s: string) => void;
  replacement: string;
  setReplacement: (s: string) => void;
  selectedMatch: number | null;
  setSelectedMatch: (n: number | null) => void;
  mode: string;
  setMode: (m: string) => void;

  // ── Computed regex state ────────────────────────────────────
  compiled: Compiled;
  matches: RegexMatch[];
  tokens: ExplainToken[];
  highlighted: ReactNode[] | null;
  execMs: number;
  replaced: string;
  parts: string[];

  // ── Mobile-specific UI state ────────────────────────────────
  activeView: MobileView;
  setActiveView: (view: MobileView) => void;
  isKeyboardOpen: boolean;
}
