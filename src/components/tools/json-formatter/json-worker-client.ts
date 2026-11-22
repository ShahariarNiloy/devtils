"use client";

import type { IndentStyle } from "./json-formatter.types";
import type {
  ActionOp,
  ActionResult,
  FormatResponse,
  ScanResponse,
  WorkerRequest,
  WorkerResponse,
} from "./json-worker-protocol";

/**
 * Above this many characters the heavy toolbar actions (Format, Minify, Sort,
 * Repair, Validate), the paste-to-format and the precision scan run in the
 * JSON worker; at or below it they stay synchronous — no round trip.
 *
 * Measured with the real lib functions (i7-1355U, Node 26): at 256 K chars
 * validate + format ≈ 5 ms, minify ≈ 3 ms, lossless format ≈ 8 ms, repair
 * ≈ 13 ms, scan ≈ 1 ms — all inside one frame, so a sync result is already
 * instant and a worker hop (message copy + an extra task) would only add
 * latency. Past it the costs grow linearly (1 MB: repair ≈ 53 ms, lossless
 * ≈ 45 ms; 50 MB: format ≈ 1 s, repair ≈ 3 s) and start dropping frames.
 * It's also the background-parse threshold, so "large" means one thing.
 */
export const WORKER_THRESHOLD = 256_000; // chars (~256 KB)

const spawn = () => new Worker(new URL("./json-parse.worker.ts", import.meta.url));

let workerSingleton: Worker | null = null;

/**
 * The background lane: parse, JS → JSON detection, precision scan. Created
 * lazily on the first large document.
 */
export function getJsonWorker(): Worker {
  if (!workerSingleton) workerSingleton = spawn();
  return workerSingleton;
}

/**
 * The action lane: a second instance of the same worker script, created
 * lazily on the first large Format / Minify / Repair. Kept apart so a click
 * never waits behind speculative background work (a JS → JSON check on a
 * broken 50 MB file takes seconds), and so a superseded action can be
 * cancelled for real: the lane is terminated and respawned rather than left
 * burning a core on a result nobody will see.
 */
let actionWorker: Worker | null = null;
let inFlight: { id: number; settle: (r: ActionResult) => void } | null = null;

let seq = 0;
export function nextWorkerSeq(): number {
  return ++seq;
}

function request<R extends WorkerResponse>(
  req: WorkerRequest,
  match: (data: WorkerResponse) => data is R,
): Promise<R> {
  return new Promise((resolve) => {
    const worker = getJsonWorker();
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      if (!match(e.data)) return;
      worker.removeEventListener("message", onMessage);
      resolve(e.data);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage(req);
  });
}

/**
 * Run a toolbar action in the action lane. Resolves with
 * `{ status: "superseded" }` when a newer action cancelled it; callers also
 * drop results whose source input is no longer current.
 */
export function runWorkerAction(op: ActionOp): Promise<ActionResult> {
  // Newer action wins: kill the running job instead of queueing behind it.
  cancelWorkerAction();
  if (!actionWorker) actionWorker = spawn();
  const worker = actionWorker;
  const id = nextWorkerSeq();
  return new Promise((resolve) => {
    const settle = (r: ActionResult) => {
      worker.removeEventListener("message", onMessage);
      if (inFlight?.id === id) inFlight = null;
      resolve(r);
    };
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      const d = e.data;
      if (d.kind === "action" && d.id === id) settle(d);
    };
    inFlight = { id, settle };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ kind: "action", id, ...op } satisfies WorkerRequest);
  });
}

/** Cancel the running action, if any (a synchronous action replaced it). */
export function cancelWorkerAction(): void {
  if (!inFlight) return;
  actionWorker?.terminate();
  actionWorker = null;
  inFlight.settle({ status: "superseded" });
  inFlight = null;
}

/** Count numbers JavaScript can't represent exactly, off the main thread. */
export function scanInWorker(src: string): Promise<number> {
  const id = nextWorkerSeq();
  return request({ kind: "scan", id, src }, (d): d is ScanResponse => d.kind === "scan" && d.id === id).then(
    (r) => r.impreciseNumbers,
  );
}

/**
 * Lossless pretty-print (`formatJsonText(src, indent, "none")`) on the
 * background lane. Resolves null when `src` isn't valid JSON. Callers tag
 * the promise with their own inputs and drop it once those change.
 */
export function formatInWorker(src: string, indent: IndentStyle): Promise<string | null> {
  const id = nextWorkerSeq();
  return request(
    { kind: "format", id, src, indent },
    (d): d is FormatResponse => d.kind === "format" && d.id === id,
  ).then((r) => (r.ok ? r.output : null));
}
