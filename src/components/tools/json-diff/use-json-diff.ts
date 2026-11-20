"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  canonicalize,
  decodeShareBody,
  diffJson,
  encodeShareBody,
  toJsonPatch,
  type ArrayStrategy,
  type DiffResult,
  type JsonPatchOp,
  type JsonValue,
} from "./json-diff.lib";

export type PointerStyle = "json-pointer" | "dot";
/** "changes" is the v2 change list (formerly the grouped "tree"). */
export type ResultView = "changes" | "patch" | "side-by-side";

export interface ParseState {
  /** Parsed value when valid; undefined when invalid or empty. */
  value: JsonValue | undefined;
  /** Error message from JSON.parse, or null. */
  error: string | null;
  /** Error line/column derived from JSON.parse's position when present. */
  line: number | null;
  col: number | null;
  /** Empty input is a distinct state from parse-error. */
  isEmpty: boolean;
}

function parse(src: string): ParseState {
  const trimmed = src.trim();
  if (!trimmed) {
    return { value: undefined, error: null, line: null, col: null, isEmpty: true };
  }
  try {
    return {
      value: JSON.parse(src) as JsonValue,
      error: null,
      line: null,
      col: null,
      isEmpty: false,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Extract line/column from V8/SpiderMonkey error position when present.
    const posMatch = /position\s+(\d+)/i.exec(msg);
    let line: number | null = null;
    let col: number | null = null;
    if (posMatch) {
      const pos = Number(posMatch[1]);
      const before = src.slice(0, pos);
      const lines = before.split("\n");
      line = lines.length;
      col = (lines[lines.length - 1]?.length ?? 0) + 1;
    }
    return {
      value: undefined,
      error: msg.replace(/\s*\(line[^)]*\)/, "").trim(),
      line,
      col,
      isEmpty: false,
    };
  }
}

const SAMPLE_LEFT = `{
  "id": "usr_9f2a",
  "name": "Ada Lovelace",
  "verified": true,
  "plan": null,
  "stats": { "projects": 12, "stars": 248 },
  "roles": ["admin", "editor"]
}`;

const SAMPLE_RIGHT = `{
  "id": "usr_9f2a",
  "name": "Ada King",
  "plan": "pro",
  "stats": { "projects": 12, "stars": 251 },
  "roles": ["admin", "editor", "owner"],
  "team": "engine"
}`;

function readShareParams(): {
  left?: string;
  right?: string;
  view?: ResultView;
} {
  const params = new URLSearchParams(window.location.search);
  const out: { left?: string; right?: string; view?: ResultView } = {};
  // Share-link bodies are base64-encoded to survive URL escaping of braces /
  // brackets / quotes that JSON puts everywhere.
  const l = params.get("l");
  const r = params.get("r");
  if (l) out.left = decodeShareBody(l) ?? undefined;
  if (r) out.right = decodeShareBody(r) ?? undefined;
  const v = params.get("v");
  // "tree" is the pre-v2 name of the change list.
  if (v === "tree" || v === "changes") out.view = "changes";
  else if (v === "patch" || v === "side-by-side") out.view = v;
  return out;
}

export interface JsonDiffState {
  // Inputs
  left: string;
  right: string;
  setLeft: (s: string) => void;
  setRight: (s: string) => void;
  swap: () => void;
  clear: () => void;
  loadSample: () => void;

  // Parsed + validation
  leftParse: ParseState;
  rightParse: ParseState;
  canDiff: boolean;

  // Diff result
  result: DiffResult | null;
  patch: JsonPatchOp[];

  // Options
  arrayStrategy: ArrayStrategy;
  setArrayStrategy: (s: ArrayStrategy) => void;
  identityKey: string;
  setIdentityKey: (k: string) => void;
  sortKeys: boolean;
  setSortKeys: (b: boolean) => void;
  hideUnchanged: boolean;
  setHideUnchanged: (b: boolean) => void;
  pointerStyle: PointerStyle;
  setPointerStyle: (s: PointerStyle) => void;

  // View
  view: ResultView;
  setView: (v: ResultView) => void;

  // Actions
  copyShareLink: () => void;
  copyPatch: () => void;
}

export function useJsonDiff(): JsonDiffState {
  const [left, setLeft] = useState(SAMPLE_LEFT);
  const [right, setRight] = useState(SAMPLE_RIGHT);

  const [arrayStrategy, setArrayStrategy] = useState<ArrayStrategy>("ordered");
  const [identityKey, setIdentityKey] = useState("id");
  const [sortKeys, setSortKeys] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(true);
  // `$.a.b` labels match the v2 change list; `/a/b` (RFC 6901) is in ⋯.
  const [pointerStyle, setPointerStyle] = useState<PointerStyle>("dot");
  // The structural change list is the v2 landing view; JSON Patch and the
  // text side-by-side are one click away in the ⋯ menu.
  const [view, setView] = useState<ResultView>("changes");

  // Share link → state, once on mount. Reading `window` during render
  // would make the first client render disagree with the server HTML.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const shared = readShareParams();
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot bridge from the URL */
    if (shared.left !== undefined) setLeft(shared.left);
    if (shared.right !== undefined) setRight(shared.right);
    if (shared.view) setView(shared.view);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Defer the inputs so typing-fast doesn't pin the diff on every keystroke
  // for big JSON. The validation banner still updates synchronously
  // (cheap) because we want errors to be responsive.
  const deferredLeft = useDeferredValue(left);
  const deferredRight = useDeferredValue(right);

  const leftParse = useMemo(() => parse(left), [left]);
  const rightParse = useMemo(() => parse(right), [right]);

  const canDiff =
    !leftParse.error &&
    !rightParse.error &&
    !leftParse.isEmpty &&
    !rightParse.isEmpty;

  const result = useMemo<DiffResult | null>(() => {
    const lp = parse(deferredLeft);
    const rp = parse(deferredRight);
    if (lp.error || rp.error || lp.isEmpty || rp.isEmpty) return null;
    const lv = sortKeys ? canonicalize(lp.value as JsonValue) : (lp.value as JsonValue);
    const rv = sortKeys ? canonicalize(rp.value as JsonValue) : (rp.value as JsonValue);
    return diffJson(lv, rv, {
      arrayStrategy,
      identityKey: arrayStrategy === "identity" ? identityKey : undefined,
    });
  }, [deferredLeft, deferredRight, arrayStrategy, identityKey, sortKeys]);

  const patch = useMemo<JsonPatchOp[]>(() => {
    if (!result) return [];
    return toJsonPatch(result);
  }, [result]);

  const swap = useCallback(() => {
    setLeft(right);
    setRight(left);
  }, [left, right]);

  const clear = useCallback(() => {
    setLeft("");
    setRight("");
  }, []);

  const loadSample = useCallback(() => {
    setLeft(SAMPLE_LEFT);
    setRight(SAMPLE_RIGHT);
  }, []);

  const copyShareLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    // Cap share-link body to keep URLs reasonable. >2KB per side gets
    // dropped — copy the input manually instead.
    if (left.length < 2048) params.set("l", encodeShareBody(left));
    if (right.length < 2048) params.set("r", encodeShareBody(right));
    params.set("v", view);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    const dropped = left.length >= 2048 || right.length >= 2048;
    navigator.clipboard.writeText(url).then(
      () =>
        dropped
          ? toast.warning("Share link copied — without the large side", {
              description: "Sides over 2 KB don't fit in a link; the recipient sees the sample there.",
            })
          : toast.success("Share link copied"),
      () => toast.error("Couldn't access the clipboard"),
    );
  }, [left, right, view]);

  const copyPatch = useCallback(() => {
    if (patch.length === 0) {
      toast.message("No changes — nothing to patch");
      return;
    }
    void navigator.clipboard.writeText(JSON.stringify(patch, null, 2));
    toast.success(`Copied ${patch.length} JSON Patch op${patch.length === 1 ? "" : "s"}`);
  }, [patch]);

  return {
    left,
    right,
    setLeft,
    setRight,
    swap,
    clear,
    loadSample,
    leftParse,
    rightParse,
    canDiff,
    result,
    patch,
    arrayStrategy,
    setArrayStrategy,
    identityKey,
    setIdentityKey,
    sortKeys,
    setSortKeys,
    hideUnchanged,
    setHideUnchanged,
    pointerStyle,
    setPointerStyle,
    view,
    setView,
    copyShareLink,
    copyPatch,
  };
}
