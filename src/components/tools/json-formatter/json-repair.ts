import type { RepairChange, RepairResult } from "./json-formatter.types";
import {
  ParseRepairError,
  parseAndRepair,
  type RepairEvent,
} from "./json-repair-parser";

export class RepairError extends Error {
  /** The actual JSON.parse error after all repairs were attempted. */
  readonly parseError: string;
  /** The best-effort repaired JSON we couldn't quite parse — handy for diffs. */
  readonly partialFixed: string;
  /** Repairs we did manage to apply along the way (back-compat). */
  readonly partialChanges: string[];
  /** Structured, located repairs. */
  readonly partialEvents: RepairChange[];
  constructor(
    parseError: string,
    partialFixed: string,
    partialChanges: string[],
    partialEvents: RepairChange[] = [],
  ) {
    super(parseError);
    this.name = "RepairError";
    this.parseError = parseError;
    this.partialFixed = partialFixed;
    this.partialChanges = partialChanges;
    this.partialEvents = partialEvents;
  }
}

/**
 * Collapse consecutive identical-message events into one "× N" line so the
 * human-readable change list stays short when a document had many of the
 * same fix (e.g. 30 missing commas). Risk + first location are preserved.
 */
function summarize(events: RepairEvent[]): { changes: string[]; tally: RepairChange[] } {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const e of events) {
    if (!counts.has(e.message)) order.push(e.message);
    counts.set(e.message, (counts.get(e.message) ?? 0) + 1);
  }
  const changes = order.map((msg) => {
    const n = counts.get(msg) ?? 1;
    return n > 1 ? `${msg} (×${n})` : msg;
  });
  return { changes, tally: events };
}

/**
 * Repair malformed JSON via the tolerant recursive-descent parser. Keeps the
 * historical contract: returns `{ fixed, changes, events, wasValid }` for a
 * recoverable input, throws `RepairError` only when there is genuinely no
 * JSON value to recover.
 */
export function repairJson(raw: string): RepairResult {
  try {
    JSON.parse(raw);
    return { fixed: raw, changes: [], events: [], wasValid: true };
  } catch {
    /* fall through to repair */
  }

  let result;
  try {
    result = parseAndRepair(raw);
  } catch (err) {
    if (err instanceof ParseRepairError) {
      const { changes } = summarize(err.events);
      throw new RepairError(err.message, raw, changes, err.events);
    }
    throw err;
  }

  // The serializer is constructed to always emit valid strict JSON, but we
  // guard with a real parse so a bug here surfaces as an honest error rather
  // than corrupt output downstream.
  try {
    JSON.parse(result.output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const { changes } = summarize(result.events);
    throw new RepairError(msg, result.output, changes, result.events);
  }

  const { changes } = summarize(result.events);
  return { fixed: result.output, changes, events: result.events, wasValid: false };
}
