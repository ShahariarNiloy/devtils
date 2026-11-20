/**
 * Turn the repair engine's dry run into a list of *problems* for the error
 * banner ("Line 2: single quotes around a key"). The repair parser reports
 * what it would do; this phrases it as what's wrong. Pure — no React.
 */

import { parseAndRepair, ParseRepairError, type RepairEvent } from "./json-repair-parser";

export interface JsonProblem {
  line: number;
  col: number;
  text: string;
}

export interface ProblemReport {
  problems: JsonProblem[];
  /** False when Repair can't produce valid JSON (nothing to recover). */
  repairable: boolean;
}

/** Above this size the banner falls back to the native parse error only. */
export const PROBLEM_SCAN_LIMIT = 256 * 1024;

const PHRASES: [RegExp, string][] = [
  [/^Normalized quotes/, "single or curly quotes"],
  [/^Removed trailing comma/, "trailing comma"],
  [/^Removed extra comma/, "extra comma"],
  [/^Quoted unquoted key/, "unquoted key"],
  [/^Quoted unquoted value/, "unquoted value"],
  [/^Inserted missing comma/, "missing comma"],
  [/^Inserted missing colon/, "missing colon after a key"],
  [/^Inserted null for missing value/, "missing value"],
  [/^Removed (line|block) comment/, "comment (not allowed in JSON)"],
  [/^Closed unclosed object/, "unclosed object"],
  [/^Closed unclosed array/, "unclosed array"],
  [/^Closed (truncated|unterminated) string/, "unterminated string"],
  [/^Escaped literal line break/, "raw line break inside a string"],
  [/^Stripped non-JSON text/, "text that isn't JSON"],
  [/^Stripped unexpected character/, "unexpected character"],
  [/^Stripped byte-order mark/, "byte-order mark"],
  [/^Removed console gutter/, "console output around the JSON"],
  [/^Python /, "Python literal (True / False / None)"],
  [/^undefined → null/, "undefined (not a JSON value)"],
  [/→ null \(not representable/, "NaN or Infinity (not JSON numbers)"],
  [/^Converted hex number/, "hex number"],
  [/^Removed leading \+/, "number with a leading +"],
  [/^Added leading zero/, "number without a leading zero"],
  [/^Removed trailing decimal point/, "number ending in a dot"],
  [/^Removed leading zeros/, "number with leading zeros"],
  [/^Removed numeric separators/, "number with _ separators"],
  [/^Removed BigInt/, "BigInt n suffix"],
  [/^Wrapped \d+ top-level values/, "several top-level values"],
  [/^Dropped duplicate object key/, "duplicate keys"],
  [/^Collapsed CSV doubled quotes/, "doubled quotes inside a string"],
  [/^Expanded \\/, "non-JSON escape sequence"],
  [/^Decoded HTML entities/, "HTML entities inside a string"],
];

function phrase(e: RepairEvent): string {
  for (const [re, text] of PHRASES) if (re.test(e.message)) return text;
  return e.message.charAt(0).toLowerCase() + e.message.slice(1);
}

/**
 * Problems in `raw` (assumed already known to be invalid JSON). Never
 * throws; an unrecoverable input reports `repairable: false`.
 */
export function findProblems(raw: string): ProblemReport {
  let events: RepairEvent[];
  let repairable = true;
  try {
    events = parseAndRepair(raw).events;
  } catch (err) {
    if (!(err instanceof ParseRepairError)) return { problems: [], repairable: false };
    events = err.events;
    repairable = false;
  }
  // One entry per distinct problem per line — "3 trailing commas on line 9"
  // is noise in a one-line banner.
  const seen = new Set<string>();
  const problems: JsonProblem[] = [];
  for (const e of events) {
    const text = phrase(e);
    const key = `${e.line}:${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    problems.push({ line: e.line, col: e.col, text });
  }
  problems.sort((a, b) => a.line - b.line || a.col - b.col);
  return { problems, repairable };
}
