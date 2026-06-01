/**
 * Tests for json-diff.lib — covers deepEqual, semantic diff over primitives /
 * objects / arrays, all three array strategies, LCS move detection, type
 * changes, JSON Patch round-trip, and canonicalize.
 *
 * Run: npx tsx src/components/tools/json-diff/__tests__/lib.test.ts
 */

/* eslint-disable no-console */

import {
  canonicalize,
  deepEqual,
  diffJson,
  toJsonPatch,
  type DiffOptions,
  type JsonValue,
} from "../json-diff.lib";

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
  const r = diff(left, right);
  const patch = toJsonPatch(r);

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
  const r = diff(1 as JsonValue, "1" as unknown as JsonValue);
  const patch = toJsonPatch(r);
  eq("type-change → replace op", patch[0]?.op, "replace");
}

{
  // Removed → remove op.
  const r = diff({ a: 1, b: 2 }, { a: 1 });
  const patch = toJsonPatch(r);
  eq("remove op", patch[0]?.op, "remove");
  eq("remove path", patch[0]?.path, "/b");
}

{
  // Move → move op with from + path.
  const r = diff(["a", "b", "c"], ["b", "c", "a"]);
  const patch = toJsonPatch(r);
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
console.log(`\n${pass + fail} tests, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
