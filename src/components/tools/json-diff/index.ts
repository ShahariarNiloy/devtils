export { JsonDiff } from "./json-diff";
export {
  applyPatch,
  canonicalize,
  deepEqual,
  diffJson,
  display,
  inlineDisplay,
  toJsonPatch,
  typeOf,
  verifyPatch,
} from "./json-diff.lib";
export type {
  ArrayStrategy,
  DiffEntry,
  DiffKind,
  DiffOptions,
  DiffResult,
  DiffStats,
  JsonPatchOp,
  JsonPrimitive,
  JsonType,
  JsonValue,
} from "./json-diff.lib";
