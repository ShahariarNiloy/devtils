"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { flushPendingEdits } from "@/components/primitives/code-editor";
import {
  computeDiff,
  computePatch,
  type CompareSettings,
  type DiffModel,
  type DiffSession,
  type PatchModel,
} from "./json-diff.engine";
import { decodeShareBody, encodeShareBody, type ArrayStrategy, type DiffKind } from "./json-diff.lib";
import type { JsonDiffRequest, JsonDiffResponse } from "./json-diff.worker";

export type PointerStyle = "json-pointer" | "dot";
/** `split` (desktop) and `unified` (mobile) are the two shapes of the row diff. */
export type ResultView = "split" | "unified" | "changes" | "patch";
export type ChangeFilter = "all" | DiffKind;

/**
 * Combined input size up to which the compare runs synchronously during
 * render (a few ms — no added latency). Above it, a worker does the work
 * after a short typing debounce, so the tab never freezes.
 */
export const SYNC_LIMIT = 512_000;
const DEBOUNCE_MS = 180;

const SAMPLE_A = {
  requestId: "req_81f2",
  updatedAt: "2026-11-20T09:14:02Z",
  order: {
    id: "ord_5521",
    status: "pending",
    currency: "USD",
    total: "48.50",
    coupon: "WELCOME10",
    items: [
      { id: 7, name: "Mechanical keyboard", qty: 1, price: 39.5 },
      { id: 12, name: "USB-C cable", qty: 2, price: 4.5 },
    ],
    shipping: { method: "standard", eta: "2026-11-25" },
  },
  customer: { id: "usr_9f2a", email: "ada@example.com", verified: false },
};

const SAMPLE_B = {
  requestId: "req_c07d",
  updatedAt: "2026-11-21T16:40:11Z",
  order: {
    id: "ord_5521",
    status: "paid",
    currency: "USD",
    total: 48.5,
    items: [
      { id: 12, name: "USB-C cable", qty: 3, price: 4.5 },
      { id: 7, name: "Mechanical keyboard", qty: 1, price: 39.5 },
      { id: 19, name: "Keycap set", qty: 1, price: 22 },
    ],
    shipping: { method: "express", eta: "2026-11-23", tracking: "1Z999AA10123456784" },
  },
  customer: { id: "usr_9f2a", email: "ada@example.com", verified: true },
};

export const SAMPLE_LEFT = JSON.stringify(SAMPLE_A, null, 2);
export const SAMPLE_RIGHT = JSON.stringify(SAMPLE_B, null, 2);
const DEFAULT_IGNORE: readonly string[] = ["requestId", "updatedAt"];

// ── Share links ──────────────────────────────────────────────────────────────

interface SharedState {
  left?: string;
  right?: string;
  view?: ResultView;
  arrayStrategy?: ArrayStrategy;
  identityKey?: string;
  sortKeys?: boolean;
  ignore?: string[];
}

/** Share-link keys. Bodies are base64 so braces / quotes survive escaping. */
const SHARE_KEYS = ["l", "r", "v", "a", "k", "s", "i"] as const;

function parseShareParams(params: URLSearchParams): SharedState {
  const out: SharedState = {};
  const l = params.get("l");
  const r = params.get("r");
  if (l) out.left = decodeShareBody(l) ?? undefined;
  if (r) out.right = decodeShareBody(r) ?? undefined;
  const v = params.get("v");
  // "tree" is the pre-v2 name of the change list; "side-by-side" the old text view.
  if (v === "tree" || v === "changes") out.view = "changes";
  else if (v === "side-by-side" || v === "split") out.view = "split";
  else if (v === "patch" || v === "unified") out.view = v;
  const a = params.get("a");
  if (a === "ordered" || a === "set" || a === "identity") out.arrayStrategy = a;
  const k = params.get("k");
  if (k !== null) out.identityKey = k;
  const sk = params.get("s");
  if (sk !== null) out.sortKeys = sk === "1";
  const i = params.get("i");
  if (i !== null) {
    const raw = decodeShareBody(i);
    try {
      const list: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) out.ignore = list.filter((x): x is string => typeof x === "string");
    } catch {
      /* bad list — keep the default */
    }
  }
  return out;
}

/**
 * Read a share link. Links keep everything in the fragment (`#l=…&r=…`),
 * which browsers never send to the server — "Local-only" stays true for
 * shared documents. Older links put the bodies in the query string; those
 * still load, and the bodies are then stripped from the address bar.
 */
function readShareParams(): SharedState {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (fromHash.has("l") || fromHash.has("r")) return parseShareParams(fromHash);

  const legacy = new URLSearchParams(window.location.search);
  if (!legacy.has("l") && !legacy.has("r")) return {};
  const shared = parseShareParams(legacy);
  for (const key of SHARE_KEYS) legacy.delete(key);
  const query = legacy.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  return shared;
}

// ── Worker plumbing ──────────────────────────────────────────────────────────

let worker: Worker | null = null;
let workerFailed = false;
/** The mounted hook's reply handler (one tool instance per page). */
type Reply = JsonDiffResponse | { kind: "failed" };
let onReply: ((res: Reply) => void) | null = null;

/** Created on the first large compare — small documents never load it. */
function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === "undefined") return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("./json-diff.worker.ts", import.meta.url));
      worker.onmessage = (e: MessageEvent<JsonDiffResponse>) => onReply?.(e.data);
      // A crashed worker (out of memory…) falls back to the main thread.
      worker.onerror = () => {
        workerFailed = true;
        worker?.terminate();
        worker = null;
        onReply?.({ kind: "failed" });
      };
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return worker;
}

let seq = 0;

interface AsyncDiff {
  id: number;
  model: DiffModel;
  /** Main-thread session when the worker was unavailable. */
  session: DiffSession | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface JsonDiffState {
  left: string;
  right: string;
  setLeft: (s: string) => void;
  setRight: (s: string) => void;
  /** The side's current text, including an edit still pending in its editor. */
  readSide: (side: "a" | "b") => string;
  swap: () => void;
  clear: () => void;
  loadSample: () => void;

  /** Latest compare (stale while a large one is in flight). */
  model: DiffModel | null;
  /** A large compare is running in the worker. */
  pending: boolean;

  arrayStrategy: ArrayStrategy;
  setArrayStrategy: (s: ArrayStrategy) => void;
  identityKey: string;
  setIdentityKey: (k: string) => void;
  ignore: readonly string[];
  addIgnore: (item: string) => void;
  removeIgnore: (item: string) => void;
  sortKeys: boolean;
  setSortKeys: (b: boolean) => void;
  hideUnchanged: boolean;
  setHideUnchanged: (b: boolean) => void;
  pointerStyle: PointerStyle;
  setPointerStyle: (s: PointerStyle) => void;

  /** Explicit view, or null for the device default (split / unified). */
  view: ResultView | null;
  setView: (v: ResultView) => void;
  filter: ChangeFilter;
  setFilter: (f: ChangeFilter) => void;
  /** Selected change (clamped), -1 when none. */
  cur: number;
  setCur: (i: number) => void;

  /** Patch for the current compare (built while the patch view is open). */
  patch: PatchModel | null;
  patchPending: boolean;

  copyShareLink: () => void;
  copyPatch: () => void;
}

export function useJsonDiff(): JsonDiffState {
  const [left, setLeftState] = useState(SAMPLE_LEFT);
  const [right, setRightState] = useState(SAMPLE_RIGHT);
  // The latest text per side, updated synchronously — so an action can call
  // `flushPendingEdits()` and read the result in the same handler.
  const latest = useRef({ left: SAMPLE_LEFT, right: SAMPLE_RIGHT });
  const setLeftRaw = useCallback((s: string) => {
    latest.current.left = s;
    setLeftState(s);
  }, []);
  const setRightRaw = useCallback((s: string) => {
    latest.current.right = s;
    setRightState(s);
  }, []);
  const readSide = useCallback((side: "a" | "b") => {
    flushPendingEdits();
    return side === "a" ? latest.current.left : latest.current.right;
  }, []);
  const [arrayStrategy, setArrayStrategyRaw] = useState<ArrayStrategy>("identity");
  const [identityKey, setIdentityKeyRaw] = useState("id");
  const [ignore, setIgnore] = useState<readonly string[]>(DEFAULT_IGNORE);
  const [sortKeys, setSortKeysRaw] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(true);
  const [pointerStyle, setPointerStyle] = useState<PointerStyle>("dot");
  const [view, setView] = useState<ResultView | null>(null);
  const [filter, setFilter] = useState<ChangeFilter>("all");
  const [curRaw, setCur] = useState(0);
  const wantPatch = view === "patch";

  const setLeft = useCallback((s: string) => {
    setLeftRaw(s);
    setCur(0);
  }, [setLeftRaw]);
  const setRight = useCallback((s: string) => {
    setRightRaw(s);
    setCur(0);
  }, [setRightRaw]);
  const setArrayStrategy = useCallback((s: ArrayStrategy) => {
    setArrayStrategyRaw(s);
    setCur(0);
  }, []);
  const setIdentityKey = useCallback((k: string) => {
    setIdentityKeyRaw(k);
    setCur(0);
  }, []);
  const setSortKeys = useCallback((b: boolean) => {
    setSortKeysRaw(b);
    setCur(0);
  }, []);
  const addIgnore = useCallback((item: string) => {
    const parts = item
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setIgnore((cur) => [...cur, ...parts.filter((p, i) => !cur.includes(p) && parts.indexOf(p) === i)]);
    setCur(0);
  }, []);
  const removeIgnore = useCallback((item: string) => {
    setIgnore((cur) => cur.filter((x) => x !== item));
    setCur(0);
  }, []);

  // Share link → state, on mount and whenever the fragment changes.
  useEffect(() => {
    const apply = () => {
      const shared = readShareParams();
      if (shared.left !== undefined) setLeftRaw(shared.left);
      if (shared.right !== undefined) setRightRaw(shared.right);
      if (shared.view) setView(shared.view);
      if (shared.arrayStrategy) setArrayStrategyRaw(shared.arrayStrategy);
      if (shared.identityKey !== undefined) setIdentityKeyRaw(shared.identityKey);
      if (shared.sortKeys !== undefined) setSortKeysRaw(shared.sortKeys);
      if (shared.ignore) setIgnore(shared.ignore);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [setLeftRaw, setRightRaw]);

  const settings = useMemo<CompareSettings>(
    () => ({ arrayStrategy, identityKey, ignore, sortKeys }),
    [arrayStrategy, identityKey, ignore, sortKeys],
  );

  // ── Small inputs: synchronous, deferred so typing stays smooth ──
  const small = left.length + right.length <= SYNC_LIMIT;
  const dLeft = useDeferredValue(left);
  const dRight = useDeferredValue(right);
  const syncOut = useMemo(
    () => (small && dLeft.length + dRight.length <= SYNC_LIMIT ? computeDiff(dLeft, dRight, settings) : null),
    [small, dLeft, dRight, settings],
  );

  // ── Large inputs: debounced, in the worker ──
  const [asyncDiff, setAsyncDiff] = useState<AsyncDiff | null>(null);
  const [pendingId, setPendingId] = useState(0);
  const latestDiffId = useRef(0);
  const latestReq = useRef<{ left: string; right: string; settings: CompareSettings } | null>(null);

  useEffect(() => {
    if (small) return;
    const timer = window.setTimeout(() => {
      const id = ++seq;
      latestDiffId.current = id;
      latestReq.current = { left, right, settings };
      const w = getWorker();
      if (!w) {
        const out = computeDiff(left, right, settings);
        setAsyncDiff({ id, model: out.model, session: out.session });
        return;
      }
      setPendingId(id);
      const req: JsonDiffRequest = { kind: "diff", id, left, right, settings };
      w.postMessage(req);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [small, left, right, settings]);

  // ── Patch ──
  const syncPatch = useMemo<PatchModel | null>(
    () => (wantPatch && syncOut?.session ? computePatch(syncOut.session) : null),
    [wantPatch, syncOut],
  );
  const [asyncPatch, setAsyncPatch] = useState<{ diffId: number; patch: PatchModel | null } | null>(null);
  const requestedPatchFor = useRef(-1);

  useEffect(() => {
    if (small || !wantPatch || !asyncDiff || !asyncDiff.model.ok) return;
    if (requestedPatchFor.current === asyncDiff.id) return;
    requestedPatchFor.current = asyncDiff.id;
    if (asyncDiff.session) {
      const session = asyncDiff.session;
      const diffId = asyncDiff.id;
      // Worker-less fallback: build after paint, off the render path.
      const t = window.setTimeout(() => setAsyncPatch({ diffId, patch: computePatch(session) }), 0);
      return () => window.clearTimeout(t);
    }
    const req: JsonDiffRequest = { kind: "patch", id: ++seq, diffId: asyncDiff.id };
    getWorker()?.postMessage(req);
  }, [small, wantPatch, asyncDiff]);

  // The worker's replies; stale ones are dropped.
  useEffect(() => {
    const handle = (res: Reply) => {
      if (res.kind === "failed") {
        const r = latestReq.current;
        if (r) {
          const out = computeDiff(r.left, r.right, r.settings);
          setAsyncDiff({ id: latestDiffId.current, model: out.model, session: out.session });
        }
        setPendingId(0);
      } else if (res.kind === "diff") {
        if (res.id !== latestDiffId.current) return;
        setAsyncDiff({ id: res.id, model: res.model, session: null });
        setPendingId(0);
      } else {
        setAsyncPatch({ diffId: res.diffId, patch: res.patch });
      }
    };
    onReply = handle;
    return () => {
      if (onReply === handle) onReply = null;
    };
  }, []);

  const model = small ? (syncOut?.model ?? null) : (asyncDiff?.model ?? null);
  const pending = !small && (pendingId !== 0 || !asyncDiff);
  const asyncPatchCurrent = asyncPatch && asyncDiff && asyncPatch.diffId === asyncDiff.id ? asyncPatch.patch : null;
  const patch = small ? syncPatch : asyncPatchCurrent;
  const patchPending = wantPatch && Boolean(model?.ok) && (model?.counts.total ?? 0) > 0 && patch === null;

  const total = model?.ok ? model.changes.length : 0;
  const cur = total ? Math.min(Math.max(curRaw, 0), total - 1) : -1;

  const swap = useCallback(() => {
    flushPendingEdits();
    const { left: l, right: r } = latest.current;
    setLeftRaw(r);
    setRightRaw(l);
    setCur(0);
  }, [setLeftRaw, setRightRaw]);

  const clear = useCallback(() => {
    flushPendingEdits();
    setLeftRaw("");
    setRightRaw("");
    setCur(0);
  }, [setLeftRaw, setRightRaw]);

  const loadSample = useCallback(() => {
    flushPendingEdits();
    setLeftRaw(SAMPLE_LEFT);
    setRightRaw(SAMPLE_RIGHT);
    setCur(0);
  }, [setLeftRaw, setRightRaw]);

  const copyShareLink = useCallback(() => {
    flushPendingEdits();
    const { left: l, right: r } = latest.current;
    const params = new URLSearchParams();
    // >2 KB per side doesn't fit a sane link — the recipient sees the sample there.
    if (l.length < 2048) params.set("l", encodeShareBody(l));
    if (r.length < 2048) params.set("r", encodeShareBody(r));
    if (view) params.set("v", view);
    params.set("a", arrayStrategy);
    if (arrayStrategy === "identity") params.set("k", identityKey);
    if (sortKeys) params.set("s", "1");
    params.set("i", encodeShareBody(JSON.stringify(ignore)));
    // Fragment, not query: it never leaves the recipient's browser.
    const url = `${window.location.origin}${window.location.pathname}#${params.toString()}`;
    const dropped = l.length >= 2048 || r.length >= 2048;
    navigator.clipboard.writeText(url).then(
      () =>
        dropped
          ? toast.warning("Share link copied — without the large side", {
              description: "Sides over 2 KB don't fit in a link; the recipient sees the sample there.",
            })
          : toast.success("Share link copied"),
      () => toast.error("Couldn't access the clipboard"),
    );
  }, [view, arrayStrategy, identityKey, sortKeys, ignore]);

  const copyPatch = useCallback(() => {
    if (!model?.ok) {
      toast.error(model?.error ?? "Both sides need to be valid JSON");
      return;
    }
    if (model.counts.total === 0) {
      toast.message("No changes — nothing to patch");
      return;
    }
    const text = patch?.text ?? (syncOut?.session ? computePatch(syncOut.session).text : null);
    if (!text) {
      toast.message("Building the patch — try again in a moment");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied JSON Patch"),
      () => toast.error("Couldn't access the clipboard"),
    );
  }, [model, patch, syncOut]);

  return {
    left,
    right,
    setLeft,
    setRight,
    readSide,
    swap,
    clear,
    loadSample,
    model,
    pending,
    arrayStrategy,
    setArrayStrategy,
    identityKey,
    setIdentityKey,
    ignore,
    addIgnore,
    removeIgnore,
    sortKeys,
    setSortKeys,
    hideUnchanged,
    setHideUnchanged,
    pointerStyle,
    setPointerStyle,
    view,
    setView,
    filter,
    setFilter,
    cur,
    setCur,
    patch,
    patchPending,
    copyShareLink,
    copyPatch,
  };
}
