export { DiffChecker } from "./diff-checker";
export { encodeShare, decodeShare, readShareFromHash, shareHashFor } from "./diff-share";
export {
  buildHunks,
  buildSideRows,
  computeStats,
  diffLines,
  diffWords,
  formatUnifiedDiff,
  splitLines,
  tokenizeWords,
} from "@/lib/diff";
export type {
  DiffOptions,
  DiffStats,
  Hunk,
  LineOp,
  SideRow,
  WordOp,
} from "@/lib/diff";
