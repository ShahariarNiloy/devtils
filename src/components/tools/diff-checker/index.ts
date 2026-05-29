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
} from "./diff-checker.lib";
export type {
  DiffOptions,
  DiffStats,
  Hunk,
  LineOp,
  SideRow,
  WordOp,
} from "./diff-checker.lib";
