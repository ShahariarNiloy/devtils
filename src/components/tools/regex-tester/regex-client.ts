"use client";

import type { RegexMatch } from "./regex.lib";

export interface RegexRunRequest {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
  mode: string;
}

export type RegexRunResult =
  | {
      status: "ok";
      matches: RegexMatch[];
      execMs: number;
      replaced: string | null;
      parts: string[] | null;
    }
  | { status: "error"; message: string }
  | { status: "timeout" };

type WorkerMessage =
  | {
      id: number;
      ok: true;
      matches: RegexMatch[];
      execMs: number;
      replaced: string | null;
      parts: string[] | null;
    }
  | { id: number; ok: false; error: string };

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./regex.worker.ts", import.meta.url));
  }
  return worker;
}

let seq = 0;
const TIMEOUT_MS = 2000;

/**
 * Run the regex in the worker with a hard timeout. If it doesn't respond in
 * time the worker is terminated (the only way to escape catastrophic
 * backtracking) and `{ status: "timeout" }` is returned; the worker is
 * lazily recreated on the next call.
 */
export function runRegex(req: RegexRunRequest): Promise<RegexRunResult> {
  return new Promise((resolve) => {
    const w = getWorker();
    const id = ++seq;
    let done = false;

    const onMessage = (e: MessageEvent<WorkerMessage>) => {
      const d = e.data;
      if (d.id !== id || done) return;
      done = true;
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      if (d.ok) {
        resolve({
          status: "ok",
          matches: d.matches,
          execMs: d.execMs,
          replaced: d.replaced,
          parts: d.parts,
        });
      } else {
        resolve({ status: "error", message: d.error });
      }
    };

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      w.removeEventListener("message", onMessage);
      w.terminate();
      worker = null; // recreated on next run
      resolve({ status: "timeout" });
    }, TIMEOUT_MS);

    w.addEventListener("message", onMessage);
    w.postMessage({ id, ...req });
  });
}
