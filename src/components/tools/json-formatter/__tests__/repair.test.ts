/**
 * Fixture-based tests for the tolerant JSON repair engine.
 *
 * Each fixture is `[name, input, expectedParsedValue]`. We assert that
 * `repairJson(input).fixed` parses to a value DEEP-EQUAL to the expected
 * one — comparing parsed values (not strings) keeps the tests robust to
 * formatting/key-order choices in the serializer.
 *
 * A second block asserts risk-tier classification and the
 * phantom-key-value / no-JSON failure cases.
 *
 * Run: npx tsx src/components/tools/json-formatter/__tests__/repair.test.ts
 */

/* eslint-disable no-console */

import { repairJson, RepairError } from "../json-repair";

let pass = 0;
let fail = 0;

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

function canon(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val).sort()) sorted[k] = (val as Record<string, unknown>)[k];
      return sorted;
    }
    return val;
  });
}

/** Assert repaired input parses to a value deep-equal to `expected`. */
function fix(name: string, input: string, expected: unknown) {
  try {
    const { fixed } = repairJson(input);
    const got = JSON.parse(fixed) as unknown;
    if (canon(got) === canon(expected)) {
      pass++;
      console.log(`  ✓ ${name}`);
    } else {
      fail++;
      console.error(`  ✗ ${name}`);
      console.error(`      expected ${canon(expected)}`);
      console.error(`      got      ${canon(got)}`);
      console.error(`      fixed    ${fixed.replace(/\n/g, "\\n")}`);
    }
  } catch (e) {
    fail++;
    console.error(`  ✗ ${name} — threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

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

// ────────────────────────────────────────────────────────────────────────────
section("Already valid (no-op)");

{
  const { wasValid, changes } = repairJson('{"a":1,"b":[2,3]}');
  check("valid input → wasValid, no changes", wasValid && changes.length === 0);
}

// ────────────────────────────────────────────────────────────────────────────
section("Quotes");

fix("single-quoted strings", "{'a': 'hello'}", { a: "hello" });
fix("single-quoted keys", "{'name': \"bob\"}", { name: "bob" });
fix("smart double quotes", '{“a”: “b”}', { a: "b" });
fix("smart single quotes", "{‘a’: ‘b’}", { a: "b" });
fix("backtick strings", "{`a`: `b`}", { a: "b" });
fix("mixed quote styles", "{'a': \"b\", \"c\": 'd'}", { a: "b", c: "d" });
fix("apostrophe inside double-quoted", '{"a": "it\'s fine"}', { a: "it's fine" });

// ────────────────────────────────────────────────────────────────────────────
section("Unquoted keys AND values");

fix("unquoted key", "{a: 1}", { a: 1 });
fix("unquoted string value", '{"status": active}', { status: "active" });
fix("unquoted key and value", "{status: active}", { status: "active" });
fix("multiple unquoted", "{role: admin, tier: gold}", { role: "admin", tier: "gold" });
fix("unquoted value with hyphen", '{"id": abc-123}', { id: "abc-123" });

// ────────────────────────────────────────────────────────────────────────────
section("Commas");

fix("trailing comma in object", '{"a":1,}', { a: 1 });
fix("trailing comma in array", "[1,2,3,]", [1, 2, 3]);
fix("missing comma newline-separated", '{\n"a":1\n"b":2\n}', { a: 1, b: 2 });
fix("missing comma SAME line", '{"a":1 "b":2}', { a: 1, b: 2 });
fix("missing comma in array (spaces)", "[1 2 3]", [1, 2, 3]);
fix("missing comma between objects in array", "[{a:1}{b:2}]", [{ a: 1 }, { b: 2 }]);
fix("duplicate commas", "[1,,2,,,3]", [1, 2, 3]);
fix("leading comma in array", "[,1,2]", [1, 2]);

// ────────────────────────────────────────────────────────────────────────────
section("Brackets / truncation");

fix("missing closing brace", '{"a":1', { a: 1 });
fix("missing closing bracket", "[1,2,3", [1, 2, 3]);
fix("nested missing closers", '{"a":{"b":[1,2', { a: { b: [1, 2] } });
fix("truncated string at EOF", '{"a":"hello', { a: "hello" });
fix("truncated mid-array with trailing comma", "[1,2,", [1, 2]);

// ────────────────────────────────────────────────────────────────────────────
section("Literals");

fix("Python True/False/None", "{a: True, b: False, c: None}", { a: true, b: false, c: null });
fix("undefined → null", '{"a": undefined}', { a: null });
fix("NaN → null", '{"a": NaN}', { a: null });
fix("Infinity → null", '{"a": Infinity}', { a: null });
fix("-Infinity → null", '{"a": -Infinity}', { a: null });

// ────────────────────────────────────────────────────────────────────────────
section("Numbers");

fix("leading + ", '{"a": +5}', { a: 5 });
fix("leading-dot decimal", '{"a": .5}', { a: 0.5 });
fix("trailing-dot decimal", '{"a": 3.}', { a: 3 });
fix("hex number", '{"a": 0x1F}', { a: 31 });
fix("numeric separators", '{"a": 1_000_000}', { a: 1000000 });
fix("BigInt suffix", '{"a": 123n}', { a: 123 });
fix("leading zeros", '{"a": 007}', { a: 7 });
fix("negative leading zeros", '{"a": -0042}', { a: -42 });
{
  // Precision: a big integer beyond Number.MAX_SAFE_INTEGER must survive
  // verbatim in the output text (we keep the raw token).
  const big = "123456789012345678901234567890";
  const { fixed } = repairJson(`{"id": ${big}x}`); // trailing x forces repair path
  check("big integer preserved verbatim", fixed.includes(big) || fixed.includes(`"${big}x"`));
}

// ────────────────────────────────────────────────────────────────────────────
section("Comments");

fix("line comment", '{"a":1 // note\n}', { a: 1 });
fix("block comment", '{"a":1 /* note */}', { a: 1 });
fix("comment between members", '{\n"a":1, // x\n"b":2\n}', { a: 1, b: 2 });
fix("URL not treated as comment", '{"u":"http://x.com/y"}', { u: "http://x.com/y" });

// ────────────────────────────────────────────────────────────────────────────
section("Wrappers / multi-root / garbage");

fix("JSONP wrapper", 'callback({"a":1});', { a: 1 });
fix("prefix garbage", 'garbage here {"a":1}', { a: 1 });
fix("suffix garbage", '{"a":1} trailing junk', { a: 1 });
fix("NDJSON → array", '{"a":1}\n{"b":2}', [{ a: 1 }, { b: 2 }]);
fix("concatenated objects", '{"a":1}{"b":2}', [{ a: 1 }, { b: 2 }]);

// ────────────────────────────────────────────────────────────────────────────
section("Console paste (the real-world case)");

fix(
  "source ref prefix",
  'app.js:42 {"foo": 1, "bar": "baz"}',
  { foo: 1, bar: "baz" },
);
fix(
  "source ref + unquoted (JS console object)",
  "app.js:42 {foo: 1, bar: 'baz'}",
  { foo: 1, bar: "baz" },
);
fix(
  "VM ref + disclosure arrow + Object prefix",
  "VM1234:56 ▶ Object {foo: 1}",
  { foo: 1 },
);
fix(
  "timestamp + count + object",
  "12:34:56.789 3 {foo: 1}",
  { foo: 1 },
);
fix(
  "trailing source ref",
  '{"foo": 1}  app.js:42',
  { foo: 1 },
);

// ────────────────────────────────────────────────────────────────────────────
section("Phantom-key-value guard");

{
  // Top-level `app.js:42` must NOT become {"app.js": 42}. With a following
  // object it's dropped as junk.
  const { fixed } = repairJson('app.js:42 {"real": true}');
  const got = JSON.parse(fixed) as Record<string, unknown>;
  check(
    "top-level ident:value not absorbed as a pair",
    canon(got) === canon({ real: true }),
    `got ${canon(got)}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
section("String content");

fix("literal newline in string escaped", '{"a": "line1\nline2 continues"}', {
  a: "line1\nline2 continues",
});
// Unquoted key forces the repair path (entity decode only runs on repair).
fix("HTML entities decoded", '{a: "Tom &amp; Jerry &lt;3"}', { a: "Tom & Jerry <3" });
fix("CSV doubled quotes", '{"a": "she said ""hi"""}', { a: 'she said "hi"' });
fix("\\u{} expanded", '{"a": "\\u{1F600}"}', { a: "\u{1F600}" });

// ────────────────────────────────────────────────────────────────────────────
section("Combined / nasty");

fix(
  "everything at once",
  "// config\n{\n  name: 'app',  // the name\n  version: 1.0,\n  tags: [stable beta],\n  meta: { build: 0x10, retries: +3, }\n}",
  { name: "app", version: 1.0, tags: ["stable", "beta"], meta: { build: 16, retries: 3 } },
);

// ────────────────────────────────────────────────────────────────────────────
section("Risk classification");

{
  const { events } = repairJson("[1,2,3,]");
  check("trailing comma is 'safe'", events.every((e) => e.risk === "safe"));
}
{
  const { events } = repairJson('{"a": Infinity}');
  check("Infinity→null is 'lossy'", events.some((e) => e.risk === "lossy"));
}
{
  const { events } = repairJson('{"a":1}{"b":2}');
  check("multi-root wrap is 'structural'", events.some((e) => e.risk === "structural"));
}
{
  const { events } = repairJson('app.js:42 {"a":1}');
  check("console clean is 'lossy'", events.some((e) => e.risk === "lossy"));
}
{
  const { events } = repairJson('{"a":1');
  check("events carry line/col", events.length > 0 && events[0].line >= 1 && events[0].col >= 1);
}

// ────────────────────────────────────────────────────────────────────────────
section("Real-world inputs (logs, Python, Mongo, AI replies, encodings)");

{
  const cases: [string, string, unknown][] = [
    ["unescaped inner quotes", '{"msg": "He said "hi" to me", "n": 1}', { msg: 'He said "hi" to me', n: 1 }],
    ["missing closing quote", '{"a": "x, "b": 2}', { a: "x", b: 2 }],
    ["missing comma between lines", '[\n {"a":1}\n {"a":2}\n]', [{ a: 1 }, { a: 2 }]],
    ["truncated deep", '{"a":[1,2,{"b":"c', { a: [1, 2, { b: "c" }] }],
    ["python dict", "{'a': True, 'b': None, 'c': (1, 2)}", { a: true, b: null, c: [1, 2] }],
    ["js undefined/Date", '{a: undefined, b: 1}', { a: null, b: 1 }],
    ["raw newline in string", '{"a": "line1\nline2"}', { a: "line1\nline2" }],
    ["double-encoded JSON string", '"{\\"a\\":1,\\"b\\":[true]}"', { a: 1, b: [true] }],
    ["markdown fence", "Here you go:\n```json\n{\"a\": 1}\n```\nHope it helps", { a: 1 }],
    ["log prefix", '2024-01-01T10:00:00Z INFO payload={"a":1,"b":"x"}', { a: 1, b: "x" }],
    ["missing colon", '{"a" 1, "b" "x"}', { a: 1, b: "x" }],
    ["extra closing brace", '{"a":1}}', { a: 1 }],
    ["mismatched bracket", '{"a":[1,2}', { a: [1, 2] }],
    ["unquoted key with space", '{first name: "x"}', { "first name": "x" }],
    ["apostrophe in single-quoted", "{'name': 'O'Brien', 'age': 3}", { name: "O'Brien", age: 3 }],
    ["NaN / Infinity", '{"a": NaN, "b": Infinity}', { a: null, b: null }],
    ["windows path", '{"path": "C:\\Users\\new\\temp"}', { path: "C:\\Users\\new\\temp" }],
    ["unquoted value with spaces", '{status: in progress, n: 2}', { status: "in progress", n: 2 }],
    ["JS assignment", 'const data = {"a": 1};', { a: 1 }],
    ["ellipsis truncation", '[1, 2, 3, ...]', [1, 2, 3]],
    ["object ellipsis", '{"a": 1, "b": 2, …}', { a: 1, b: 2 }],
    ["html-escaped", '{&quot;a&quot;: 1}', { a: 1 }],
    ["url-encoded", '%7B%22a%22%3A1%7D', { a: 1 }],
    ["missing opening brace", '"a": 1, "b": 2}', { a: 1, b: 2 }],
    ["mongo shell", '{"_id": ObjectId("507f1f77bcf86cd799439011"), "at": ISODate("2024-01-01T00:00:00Z")}', { _id: "507f1f77bcf86cd799439011", at: "2024-01-01T00:00:00Z" }],
    ["comments + trailing commas", '{\n // c\n "a": 1, /* b */\n "b": [1,2,],\n}', { a: 1, b: [1, 2] }],
    ["ndjson", '{"a":1}\n{"a":2}', [{ a: 1 }, { a: 2 }]],
    ["python repr nested", "[{'k': 'v', 'f': False}, {'k': \"it's\"}]", [{ k: "v", f: false }, { k: "it's" }]],
    ["missing value", '{"a": , "b": 2}', { a: null, b: 2 }],
    ["smart quotes", '{“a”: “b”}', { a: "b" }],
    ["truncated mid-key", '{"a": 1, "lo', { a: 1 }],
    ["unescaped tab/control", '{"a": "x\ty"}', { a: "x\ty" }],
    ["key without value at end", '{"a": 1, "b"}', { a: 1, b: null }],
    ["array missing commas", '[1 2 3]', [1, 2, 3]],
    ["stringified numbers kept", '{"zip": 007}', { zip: 7 }],
  ];
  for (const [name, input, want] of cases) fix(name, input, want);
}

// ────────────────────────────────────────────────────────────────────────────
section("Heuristics don't break what already worked");

{
  const cases: [string, string, unknown][] = [
    ["missing comma, quoted array", '["a" "b"]', ["a", "b"]],
    ["missing comma, members", '{"a":"x" "b":"y"}', { a: "x", b: "y" }],
    ["missing comma, bare key next", '{"a":"x" b: 1}', { a: "x", b: 1 }],
    ["colon inside string", "{'url': 'http://x.com/a:b'}", { url: "http://x.com/a:b" }],
    ["apostrophe in double-quoted", "{'k': \"it's\", z: 1}", { k: "it's", z: 1 }],
    ["valid escaped quotes", '{"a": "He said \\"hi\\"", }', { a: 'He said "hi"' }],
    ["valid double backslash path", '{"p":"C:\\\\Users\\\\x",}', { p: "C:\\Users\\x" }],
    ["regex invalid escape", '{"re": "\\d+\\s",}', { re: "\\d+\\s" }],
    ["escaped newline stays", '{"a": "l1\\nl2",}', { a: "l1\nl2" }],
    ["inner quotes then array", '{"text": "a "quoted" word", "b": [1,2]}', { text: 'a "quoted" word', b: [1, 2] }],
    ["inner number quote", '{"t": "scored "5" points", "x": 1}', { t: 'scored "5" points', x: 1 }],
    ["truncated value", '{"a": "abc', { a: "abc" }],
    ["unterminated before newline key", '{"a": "abc\n "c": 1}', { a: "abc", c: 1 }],
    ["scalar ndjson", "1\n2\n3", [1, 2, 3]],
    ["two objects in prose", 'Here: {"a":1} and {"b":2}', [{ a: 1 }, { b: 2 }]],
    ["quoted ellipsis is data", '["...", "a"]', ["...", "a"]],
    ["mongo big NumberLong", '{"n": NumberLong("12345678901234567890")}', { n: 12345678901234567890 }],
    ["new Date", '{"d": new Date("2024-01-01")}', { d: "2024-01-01" }],
    ["constructors in array", '[ObjectId("a"), ObjectId("b")]', ["a", "b"]],
    ["phrase then newline key", "{status: in progress\n n: 2}", { status: "in progress", n: 2 }],
    ["multiple spaced keys", '{first name: "x", last name: "y"}', { "first name": "x", "last name": "y" }],
    ["single-quoted multi apostrophe", "{'s': 'rock 'n' roll', 'k': 1}", { s: "rock 'n' roll", k: 1 }],
    ["python repr list of tuples", "[(1, 'a'), (2, 'b')]", [[1, "a"], [2, "b"]]],
    ["UNC path", '{"p": "\\\\server\\share"}', { p: "\\\\server\\share" }],
    ["console paste", 'app.js:12 {a: 1, b: [1,2,]}', { a: 1, b: [1, 2] }],
    ["literal after space ends string", '{"a" true, "b" null}', { a: true, b: null }],
  ];
  for (const [name, input, want] of cases) fix(name, input, want);
  check("valid JSON string that isn't JSON stays valid", repairJson('"just a string"').wasValid);
  const d = repairJson('"{\\"a\\":1}"');
  check("double-encoded JSON is decoded (and reviewed: structural)", !d.wasValid && d.events.some((e) => e.risk === "structural"));
}

// ────────────────────────────────────────────────────────────────────────────
section("Performance bounds (adversarial input stays linear)");

{
  const time = (input: string) => {
    const t = performance.now();
    try { repairJson(input); } catch { /* only timing matters */ }
    return performance.now() - t;
  };
  const N = 1_000_000;
  const adversarial: [string, string][] = [
    ["wrong inner-quote guesses", "[" + "'a' bbbbbbbbbbbb, ".repeat(N / 18) + "1]"],
    ["invalid escapes in every string", "[" + '"C:\\Users\\Ab\\Cd",'.repeat(N / 20) + "1]"],
    ["unclosed 5 MB string", '{"c":"' + "x".repeat(5_000_000)],
  ];
  for (const [name, input] of adversarial) {
    const ms = time(input);
    check(`${name} (${(input.length / 1e6).toFixed(1)} MB) under 1.5 s`, ms < 1500, `${ms.toFixed(0)} ms`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
section("Hard failure (no JSON to recover)");

{
  let threw = false;
  try {
    repairJson("this is just prose with no structure at all");
  } catch (e) {
    threw = e instanceof RepairError;
  }
  check("pure prose → RepairError", threw);
}

// ────────────────────────────────────────────────────────────────────────────
console.log(`\n${pass + fail} tests, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
