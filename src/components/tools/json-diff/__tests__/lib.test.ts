/**
 * Tests for json-diff.lib — covers deepEqual, semantic diff over primitives /
 * objects / arrays, all three array strategies, LCS move detection, type
 * changes, JSON Patch round-trip, and canonicalize.
 *
 * Run: npx tsx src/components/tools/json-diff/__tests__/lib.test.ts
 */

/* eslint-disable no-console */

import {
  applyPatch,
  canonicalize,
  deepEqual,
  diffJson,
  hashValue,
  lineView,
  ROW_ADD,
  ROW_CHG,
  ROW_DEL,
  ROW_IGN,
  ROW_SAME,
  toJsonPatch,
  verifyPatch,
  type DiffOptions,
  type JsonValue,
} from "../json-diff.lib";
import { computeDiff, computePatch, parseSide } from "../json-diff.engine";
import { itemForRow, splitList, tokenizePatchLine, unifiedList } from "../json-diff.view";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, hint?: string) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}`);
    if (hint) console.error(`      ${hint}`);
  }
}

function eq(label: string, a: unknown, b: unknown) {
  check(label, a === b, `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function deep(label: string, a: unknown, b: unknown) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  check(label, ok, ok ? "" : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

function diff(left: JsonValue, right: JsonValue, options?: DiffOptions) {
  return diffJson(left, right, options);
}

// ────────────────────────────────────────────────────────────────────────────
section("deepEqual");

check("primitives equal", deepEqual(1, 1));
check("strings equal", deepEqual("a", "a"));
check("nulls equal", deepEqual(null, null));
check("different types not equal", !deepEqual(1, "1" as unknown as JsonValue));
check("nested objects equal regardless of key order", deepEqual(
  { a: 1, b: { c: 2, d: 3 } },
  { b: { d: 3, c: 2 }, a: 1 },
));
check("arrays equal element-wise", deepEqual([1, [2, 3]], [1, [2, 3]]));
check("arrays differ on reorder", !deepEqual([1, 2, 3], [3, 2, 1]));

// ────────────────────────────────────────────────────────────────────────────
section("Primitive diffs");

{
  const r = diff(1, 2);
  eq("changed count = 1", r.stats.changed, 1);
  eq("entry kind = changed", r.entries[0].kind, "changed");
  eq("entry left = 1", r.entries[0].left, 1);
  eq("entry right = 2", r.entries[0].right, 2);
}

{
  const r = diff(1, "1" as unknown as JsonValue);
  eq("type change kind", r.entries[0].kind, "type");
  deep("typeChange tuple", r.entries[0].typeChange, ["number", "string"]);
  eq("typeChanges stat = 1", r.stats.typeChanges, 1);
}

{
  const r = diff("hello", "hello");
  eq("identical strings → no entries", r.entries.length, 0);
  eq("total stat = 0", r.stats.total, 0);
}

// ────────────────────────────────────────────────────────────────────────────
section("Object diffs");

{
  const r = diff({ a: 1, b: 2 }, { a: 1, b: 3 });
  eq("one change", r.stats.changed, 1);
  eq("pointer is /b", r.entries[0].pointer, "/b");
  eq("path is b", r.entries[0].path, "b");
}

{
  const r = diff({ a: 1 }, { a: 1, b: 2 });
  eq("added detected", r.stats.added, 1);
  eq("pointer is /b", r.entries[0].pointer, "/b");
  eq("right value preserved", r.entries[0].right, 2);
}

{
  const r = diff({ a: 1, b: 2 }, { a: 1 });
  eq("removed detected", r.stats.removed, 1);
  eq("pointer is /b", r.entries[0].pointer, "/b");
  eq("left value preserved", r.entries[0].left, 2);
}

{
  // Object key order doesn't affect diff result.
  const r = diff({ a: 1, b: 2 }, { b: 2, a: 1 });
  eq("key reorder produces zero diffs", r.stats.total, 0);
}

{
  // Special characters in keys round-trip through RFC 6901 escaping.
  const r = diff({ "a/b": 1 }, { "a/b": 2 });
  eq("escaped pointer", r.entries[0].pointer, "/a~1b");
  eq("friendly path with bracket-quoted key", r.entries[0].path, '["a/b"]');
}

// ────────────────────────────────────────────────────────────────────────────
section("Nested diffs");

{
  const r = diff(
    { user: { name: "alice", age: 30 } },
    { user: { name: "alice", age: 31 } },
  );
  eq("one nested change", r.stats.changed, 1);
  eq("nested pointer", r.entries[0].pointer, "/user/age");
  eq("nested path", r.entries[0].path, "user.age");
}

// ────────────────────────────────────────────────────────────────────────────
section("Array — ordered (positional)");

{
  // No moves: same positions, value at index 1 changes.
  const r = diff([1, 2, 3], [1, 9, 3]);
  eq("one changed in ordered array", r.stats.changed, 1);
  eq("pointer is /1", r.entries[0].pointer, "/1");
  eq("path is [1]", r.entries[0].path, "[1]");
}

{
  // Length-change beyond common prefix.
  const r = diff([1, 2], [1, 2, 3], { noMoves: true });
  eq("one added at index 2", r.stats.added, 1);
  eq("pointer is /2", r.entries[0].pointer, "/2");
}

// ────────────────────────────────────────────────────────────────────────────
section("Array — LCS move detection");

{
  // Reorder: ["a", "b", "c"] → ["b", "c", "a"]. Pure move.
  const r = diff(["a", "b", "c"], ["b", "c", "a"]);
  eq("zero non-move entries", r.stats.added + r.stats.removed + r.stats.changed, 0);
  eq("one move (a from 0 to 2)", r.stats.moves, 1);
  const m = r.entries.find((e) => e.kind === "moved");
  deep("move tuple", m?.move, [0, 2]);
}

{
  // Mixed: 'a' or 'b' moves; 'c' → 'd' is a value change at the trailing
  // position. LCS chooses one of {a, b} as the common subsequence; the
  // other one becomes a move. Either way: ≥1 move + 1 change.
  const r = diff(["a", "b", "c"], ["b", "a", "d"]);
  check("at least one move", r.stats.moves >= 1);
  check("one change for c → d", r.stats.changed === 1);
}

{
  // noMoves opt-out: same reorder, but moves disabled → remove + add.
  const r = diff(["a", "b", "c"], ["b", "c", "a"], { noMoves: true });
  eq("noMoves: no moves recorded", r.stats.moves, 0);
}

// ────────────────────────────────────────────────────────────────────────────
section("Array — set strategy");

{
  // Order-independent: same elements in different order → no diff.
  const r = diff(["a", "b", "c"], ["c", "a", "b"], { arrayStrategy: "set" });
  eq("set: reorder is invisible", r.stats.total, 0);
}

{
  // One added, one removed (as sets).
  const r = diff(["a", "b"], ["b", "c"], { arrayStrategy: "set" });
  eq("set: one removed", r.stats.removed, 1);
  eq("set: one added", r.stats.added, 1);
  eq("set: zero moves", r.stats.moves, 0);
}

// ────────────────────────────────────────────────────────────────────────────
section("Array — identity-keyed");

{
  // Items match by id regardless of position; nested field change surfaces.
  const r = diff(
    [{ id: 1, name: "a" }, { id: 2, name: "b" }],
    [{ id: 2, name: "b" }, { id: 1, name: "a-changed" }],
    { arrayStrategy: "identity", identityKey: "id" },
  );
  eq("identity: one changed", r.stats.changed, 1);
  eq("identity: zero moves", r.stats.moves, 0);
  // The matched-item path is at LEFT's index 0 (where id=1 lived in left).
  const c = r.entries.find((e) => e.kind === "changed");
  eq("change pointer at /0/name", c?.pointer, "/0/name");
}

{
  // Item present in left, missing in right → removed.
  const r = diff(
    [{ id: 1, name: "a" }, { id: 2, name: "b" }],
    [{ id: 1, name: "a" }],
    { arrayStrategy: "identity", identityKey: "id" },
  );
  eq("identity: removed when missing in right", r.stats.removed, 1);
  // Removed used LEFT's index = 1.
  const rem = r.entries.find((e) => e.kind === "removed");
  eq("removed pointer at /1", rem?.pointer, "/1");
}

{
  // Identity-keyed falls back to ordered when an item lacks the key.
  const r = diff(
    [{ id: 1, name: "a" }, { foo: "missing-id" }],
    [{ id: 1, name: "a-changed" }, { foo: "missing-id" }],
    { arrayStrategy: "identity", identityKey: "id" },
  );
  // Falls back to ordered → name change at index 0.
  eq("fallback to ordered", r.stats.changed, 1);
}

// ────────────────────────────────────────────────────────────────────────────
section("Canonicalize");

{
  const obj: JsonValue = { z: 1, a: 2, m: { y: 3, x: 4 } };
  const c = canonicalize(obj);
  deep(
    "keys sorted at every level",
    JSON.stringify(c),
    JSON.stringify({ a: 2, m: { x: 4, y: 3 }, z: 1 }),
  );
}

{
  // Array element order is NOT changed by canonicalize.
  const c = canonicalize([3, 1, 2]);
  deep("array order preserved", c, [3, 1, 2]);
}

// ────────────────────────────────────────────────────────────────────────────
section("JSON Patch (RFC 6902)");

{
  // Roundtrip: applying the patch to left should produce right (we just
  // verify the patch shape here — runtime application is the consumer's
  // job).
  const left: JsonValue = { name: "alice", age: 30, tags: ["a", "b"] };
  const right: JsonValue = { name: "alice", age: 31, tags: ["a", "b", "c"] };
  const patch = toJsonPatch(left, right);

  // Should produce: replace /age + add /tags/2 (in some order)
  const replace = patch.find((p) => p.op === "replace");
  const add = patch.find((p) => p.op === "add");
  eq("replace op exists", replace?.op, "replace");
  eq("replace path", replace?.path, "/age");
  // value of replace is right's age = 31
  if (replace && replace.op === "replace") {
    eq("replace value", replace.value, 31);
  }
  eq("add op exists", add?.op, "add");
  eq("add path", add?.path, "/tags/2");
}

{
  // Type change emits a replace, not a special op.
  const patch = toJsonPatch(1, "1");
  eq("type-change → replace op", patch[0]?.op, "replace");
}

{
  // Removed → remove op.
  const patch = toJsonPatch({ a: 1, b: 2 }, { a: 1 });
  eq("remove op", patch[0]?.op, "remove");
  eq("remove path", patch[0]?.path, "/b");
}

{
  // Move → move op with from + path.
  const patch = toJsonPatch(["a", "b", "c"], ["b", "c", "a"]);
  const move = patch.find((p) => p.op === "move");
  eq("move op present", move?.op, "move");
  if (move && move.op === "move") {
    eq("move from /0", move.from, "/0");
    eq("move to /2", move.path, "/2");
  }
}

// ────────────────────────────────────────────────────────────────────────────
section("Stats consistency");

{
  const r = diff(
    { a: 1, b: 2, c: [1, 2, 3] },
    { a: 1, b: "2", c: [1, 9, 3, 4] },
  );
  // Expected: b is type change (number→string), c[1] changed, c[3] added.
  eq("total equals sum of kinds", r.stats.total,
    r.stats.added + r.stats.removed + r.stats.changed + r.stats.typeChanges + r.stats.moves);
  check("at least one type change", r.stats.typeChanges >= 1);
}

// ────────────────────────────────────────────────────────────────────────────
section("Structural hash");

check("hash ignores key order", hashValue({ a: 1, b: [1, { c: 2 }] }) === hashValue({ b: [1, { c: 2 }], a: 1 }));
check("hash: 0 and -0 equal", hashValue(0) === hashValue(-0));
check("hash: array order matters", hashValue([1, 2]) !== hashValue([2, 1]));
check("hash: '1' vs 1 differ", hashValue("1") !== hashValue(1));

// ────────────────────────────────────────────────────────────────────────────
section("Ignore list");

{
  const l = { requestId: "a", meta: { updatedAt: 1, keep: 1 }, items: [{ id: 1, updatedAt: 5, v: 1 }] };
  const r = { requestId: "b", meta: { updatedAt: 2, keep: 2 }, items: [{ id: 1, updatedAt: 6, v: 1 }] };
  const res = diffJson(l, r, { ignore: ["requestId", "updatedAt"] });
  eq("key names ignored everywhere → 1 change left", res.stats.total, 1);
  eq("ignored count = 3", res.stats.ignored, 3);
  eq("remaining change is meta.keep", res.entries[0]?.path, "meta.keep");
}
{
  const l = { meta: { requestId: 1 }, requestId: 1 };
  const r = { meta: { requestId: 2 }, requestId: 2 };
  const res = diffJson(l, r, { ignore: ["$.meta.requestId"] });
  eq("path ignores one spot only", res.stats.total, 1);
  eq("…the other requestId still reported", res.entries[0]?.path, "requestId");
}
{
  const l = { items: [{ at: 1, v: 1 }, { at: 2, v: 2 }] };
  const r = { items: [{ at: 9, v: 1 }, { at: 8, v: 3 }] };
  const res = diffJson(l, r, { ignore: ["$.items[*].at"] });
  eq("[*] wildcard ignores every item's field", res.stats.total, 1);
  eq("…ignored 2", res.stats.ignored, 2);
}
{
  const res = diffJson({ a: 1 }, { a: 1, b: 2 }, { ignore: ["b"] });
  eq("added ignored key isn't a change", res.stats.total, 0);
  eq("…but counts as ignored", res.stats.ignored, 1);
}
{
  const ops = toJsonPatch({ a: 1, t: 1 }, { a: 2, t: 2 }, { ignore: ["t"] });
  eq("patch skips ignored keys", ops.length, 1);
  check("patch with ignore still verifies", verifyPatch({ a: 1, t: 1 }, { a: 2, t: 2 }, ops, { ignore: ["t"] }));
}

// ────────────────────────────────────────────────────────────────────────────
section("Identity-keyed paths");

{
  const r = diffJson(
    { items: [{ id: 7, q: 1 }, { id: 12, q: 2 }] },
    { items: [{ id: 12, q: 3 }, { id: 7, q: 1 }, { id: 19, q: 1 }] },
    { arrayStrategy: "identity", identityKey: "id" },
  );
  deep("paths use [id=…] labels", r.entries.map((e) => e.path), ["items[id=12].q", "items[id=19]"]);
  deep("pointers stay positional", r.entries.map((e) => e.pointer), ["/items/1/q", "/items/2"]);
}
{
  const r = diffJson([{ id: "a" }], [{ id: "a" }, { id: "b" }], { arrayStrategy: "identity", identityKey: "id" });
  eq("string ids unquoted in label", r.entries[0]?.path, "[id=b]");
}

// ────────────────────────────────────────────────────────────────────────────
section("Ordered arrays at scale (Myers)");

{
  const n = 20000;
  const left = Array.from({ length: n }, (_, i) => ({ id: i, v: i }));
  const right = left.map((x) => ({ ...x }));
  right.splice(5000, 1); // one removal in the middle
  right[15000] = { id: 15001, v: -1 }; // one in-place change
  const t0 = performance.now();
  const r = diffJson(left, right);
  const ms = performance.now() - t0;
  eq("removal found (not a cascade of changes)", r.stats.removed, 1);
  eq("one nested change", r.stats.changed, 1);
  check(`20k-item ordered diff is fast (${ms.toFixed(1)} ms < 250)`, ms < 250);
}
{
  const r = diffJson([1, 2, 3, 4], [1, 2, 3, 4, 5], { maxEdits: 0 });
  eq("over budget → positional; trailing add", r.stats.added, 1);
}

// ────────────────────────────────────────────────────────────────────────────
section("Set strategy at scale");

{
  const n = 20000;
  const left = Array.from({ length: n }, (_, i) => ({ k: `item-${i}` }));
  const right = left.slice().reverse();
  right.push({ k: "new" });
  const t0 = performance.now();
  const r = diffJson(left, right, { arrayStrategy: "set" });
  const ms = performance.now() - t0;
  eq("set: only the new item", r.stats.total, 1);
  check(`20k-item set diff is linear (${ms.toFixed(1)} ms < 200)`, ms < 200);
}

// ────────────────────────────────────────────────────────────────────────────
section("applyPatch");

{
  const doc: JsonValue = { a: [1, 2, 3], b: { c: 1 } };
  const out = applyPatch(doc, [
    { op: "remove", path: "/a/0" },
    { op: "add", path: "/a/-", value: 9 },
    { op: "replace", path: "/b/c", value: 2 },
    { op: "move", from: "/b", path: "/d" },
  ]);
  deep("ops applied in order", out, { a: [2, 3, 9], d: { c: 2 } });
  deep("input not mutated", doc, { a: [1, 2, 3], b: { c: 1 } });
}
{
  let threw = false;
  try {
    applyPatch({ a: 1 }, [{ op: "remove", path: "/zz" }]);
  } catch {
    threw = true;
  }
  check("missing path throws", threw);
}

// ────────────────────────────────────────────────────────────────────────────
section("Patch round-trip (fuzz, all strategies)");

{
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const gen = (depth: number): JsonValue => {
    const r = rnd();
    if (depth > 3 || r < 0.35) {
      const p = rnd();
      if (p < 0.25) return Math.floor(rnd() * 5);
      if (p < 0.5) return ["a", "b", "c"][Math.floor(rnd() * 3)];
      if (p < 0.7) return rnd() < 0.5;
      if (p < 0.8) return null;
      return String(Math.floor(rnd() * 3));
    }
    if (r < 0.65) return Array.from({ length: Math.floor(rnd() * 6) }, () => gen(depth + 1));
    if (r < 0.8) return Array.from({ length: Math.floor(rnd() * 5) }, (_, i) => ({ id: Math.floor(rnd() * 4) + i * 10, v: gen(depth + 1) }));
    const o: Record<string, JsonValue> = {};
    for (let i = 0; i < Math.floor(rnd() * 5); i++) o[["x", "y", "z", "w"][Math.floor(rnd() * 4)]] = gen(depth + 1);
    return o;
  };
  let ok = 0;
  let total = 0;
  let bad = "";
  for (let i = 0; i < 600; i++) {
    const a = gen(0);
    const b = gen(0);
    for (const strategy of ["ordered", "set", "identity"] as const) {
      const opts: DiffOptions = { arrayStrategy: strategy, identityKey: "id" };
      total++;
      const ops = toJsonPatch(a, b, opts);
      let good = false;
      try {
        good = deepEqual(applyPatch(a, ops), b);
      } catch {
        good = false;
      }
      // No differences ⇔ empty change list (for ordered; set/identity are order-free).
      const d = diffJson(a, b, opts);
      if (strategy === "ordered" && (d.stats.total === 0) !== deepEqual(a, b)) good = false;
      if (good) ok++;
      else if (!bad) bad = `${strategy}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`;
    }
  }
  eq(`patch(a→b) applied to a deep-equals b (${total} cases)`, ok, total);
  if (bad) console.error(`      first failure: ${bad}`);
}

// ────────────────────────────────────────────────────────────────────────────
section("Row table");

{
  const a = { x: 1, list: [1, 2], o: { k: "v" } };
  const res = diffJson(a, { o: { k: "v" }, list: [1, 2], x: 1 }, {}, { rows: true });
  const rows = res.rows;
  check("rows built", rows !== undefined);
  if (rows) {
    eq("identical docs: every row same", Array.from(rows.kind).every((k) => k === ROW_SAME), true);
    eq("row count = pretty-printed line count", rows.count, JSON.stringify(a, null, 2).split("\n").length);
    const text = Array.from({ length: rows.left.count }, (_, i) => {
      const v = lineView(rows, rows.left, i);
      return `${"  ".repeat(v.ind)}${v.key ? `${v.key}: ` : ""}${v.text}${v.comma ? "," : ""}`;
    }).join("\n");
    eq("left lines reproduce JSON.stringify(…, 2)", text, JSON.stringify(a, null, 2));
  }
}
{
  const res = diffJson({ a: 1, b: "x", c: [1] }, { a: 2, b: 5, d: true }, { ignore: [] }, { rows: true });
  const kinds = Array.from(res.rows?.kind ?? []);
  check("changed primitive → CHG row", kinds.includes(ROW_CHG));
  check("removed key → DEL rows", kinds.includes(ROW_DEL));
  check("added key → ADD row", kinds.includes(ROW_ADD));
  check("every change points at a row of its own cid", res.entries.every((e, i) => res.rows?.cid[e.row ?? -1] === i));
}
{
  const res = diffJson({ t: 1, v: 1 }, { t: 2, v: 1 }, { ignore: ["t"] }, { rows: true });
  check("ignored key → IGN row", Array.from(res.rows?.kind ?? []).includes(ROW_IGN));
}

// ────────────────────────────────────────────────────────────────────────────
section("Display lists");

{
  const big: Record<string, number> = {};
  for (let i = 0; i < 40; i++) big[`k${i}`] = i;
  const changed = { ...big, k20: -1 };
  const rows = diffJson(big, changed, {}, { rows: true }).rows;
  if (rows) {
    const full = splitList(rows, false);
    const folded = splitList(rows, true);
    eq("no folding when off", full.count, rows.count);
    check("folding shrinks the list", folded.count < 12);
    const folds = Array.from(folded.items).filter((x) => x < 0);
    eq("two folds around one change", folds.length, 2);
    const changeRow = Array.from(rows.kind).indexOf(ROW_CHG);
    eq("itemForRow finds the change", folded.items[itemForRow(folded, changeRow)], changeRow);
    const uni = unifiedList(rows, false);
    eq("unified: a changed row becomes − and +", uni.count, rows.count + 1);
  }
}

// ────────────────────────────────────────────────────────────────────────────
section("Engine");

{
  const p = parseSide('{\n  "a": 1,\n  "b" 2\n}');
  check("parse error has a line", p.status.state === "error" && p.status.line === 3);
  eq("empty input", parseSide("  \n").status.state, "empty");
  const ok = parseSide('{"a":1}\n');
  eq("valid: line count ignores trailing newline", ok.status.state === "ok" ? ok.status.lines : -1, 1);
}
{
  const { model, session } = computeDiff('{"total":"48.50"}', '{"total":48.5}', { arrayStrategy: "identity", identityKey: "id", ignore: [], sortKeys: false });
  eq("type change flagged", model.changes[0]?.kind, "type");
  eq("…with its types", model.changes[0]?.types, "string → number");
  eq("…and previews", `${model.changes[0]?.a} → ${model.changes[0]?.b}`, '"48.50" → 48.5');
  const patch = session ? computePatch(session) : null;
  check("patch verified", patch?.verified === true);
}
{
  const { model } = computeDiff('{"b":1,"a":[1,2]}', '{ "a": [1, 2], "b": 1 }', { arrayStrategy: "ordered", identityKey: "id", ignore: [], sortKeys: false });
  eq("reordered keys + formatting → no differences", model.counts.total, 0);
}
{
  const toks = tokenizePatchLine('    "op": "replace",');
  deep("patch tokens", toks.filter((t) => t.k !== "plain").map((t) => t.k), ["key", "punct", "op", "punct"]);
}

// ────────────────────────────────────────────────────────────────────────────
console.log(`\n${pass + fail} tests, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
