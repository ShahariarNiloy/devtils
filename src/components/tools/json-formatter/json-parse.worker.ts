/// <reference lib="webworker" />

/**
 * Off-main-thread JSON.parse + validation. Used for large inputs (see
 * `use-async-parsed`). The worker owns the heavy parse AND derives the
 * validity / error position, so the main thread never re-parses the
 * document just to drive the validation banner.
 */

interface ParseRequest {
  id: number;
  src: string;
}
type ParseResponse =
  | { id: number; ok: true; value: unknown; bytes: number; lines: number }
  | { id: number; ok: false; message: string; line: number; col: number };

// Worker globals collide with the DOM lib in this project's tsconfig; this
// single cast narrows `self` to the worker scope so the message API is typed.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

const encoder = new TextEncoder();

function countLines(s: string): number {
  let n = 1;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

// Inlined (no app imports — keeps the worker bundle tiny). Mirrors
// json-formatter.lib's parseErrorPosition.
function errorPos(
  message: string,
  raw: string,
): { message: string; line: number; col: number } {
  const posMatch = /position\s+(\d+)/i.exec(message);
  if (posMatch) {
    const pos = Number(posMatch[1]);
    const before = raw.slice(0, pos);
    const lines = before.split("\n");
    return {
      message: message.replace(/\s*\(line[^)]*\)/, "").trim(),
      line: lines.length,
      col: (lines[lines.length - 1]?.length ?? 0) + 1,
    };
  }
  const lc = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (lc) {
    return { message, line: Number(lc[1]), col: Number(lc[2]) };
  }
  return { message, line: 1, col: 1 };
}

ctx.onmessage = (e: MessageEvent<ParseRequest>) => {
  const { id, src } = e.data;
  try {
    const value: unknown = JSON.parse(src);
    ctx.postMessage({
      id,
      ok: true,
      value,
      bytes: encoder.encode(src).length,
      lines: countLines(src),
    } satisfies ParseResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const { message, line, col } = errorPos(msg, src);
    ctx.postMessage({
      id,
      ok: false,
      message,
      line,
      col,
    } satisfies ParseResponse);
  }
};

export {};
