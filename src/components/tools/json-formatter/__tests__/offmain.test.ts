/**
 * Equivalence tests for the off-main-thread helpers: the chunked tree
 * transfer (json-transfer.ts) and the sliced whole-document passes
 * (json-sliced.lib.ts) must produce exactly what the one-shot code does.
 *
 * Run: npx tsx src/components/tools/json-formatter/__tests__/offmain.test.ts
 */

/* eslint-disable no-console */

import { byteLength, computeStats } from "../json-formatter.lib";
import { byteLengthSteps, computeStatsSteps, encodeUtf8Steps, lineCountSteps } from "../json-sliced.lib";
import { applyPart, splitForTransfer } from "../json-transfer";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}
function drain<T>(g: Generator<void, T>): T {
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/** Worker → main round trip: split, structured-clone each message, reassemble. */
function roundTrip(src: string): { text: string; parts: number } {
  const { skeleton, parts } = splitForTransfer(JSON.parse(src), src.length);
  const value = structuredClone(skeleton);
  for (const p of parts) applyPart(value, structuredClone(p));
  return { text: JSON.stringify(value), parts: parts.length };
}

const rec = (i: number) => ({ id: i, name: `n${i}`, tags: ["a", "b"], geo: { lat: i / 7, lng: -i }, ok: i % 2 === 0, x: null });
const big = (n: number) => Array.from({ length: n }, (_, i) => rec(i));

console.log("── transfer ──");
const shapes: [string, unknown, boolean][] = [
  ["root array", big(60_000), true],
  ["wrapped array", { meta: { v: 1 }, data: big(60_000), tail: "z" }, true],
  ["nested spine", { a: 1, b: { c: [1, 2], d: { rows: big(60_000) } }, e: [3] }, true],
  ["wide object", Object.fromEntries(big(60_000).map((r, i) => [`k${i}`, r])), true],
  ["integer + __proto__ keys", Object.fromEntries([["__proto__", 1], ...big(60_000).map((r, i): [string, unknown] => [i % 3 ? `k${i}` : String(i), r])]), true],
  ["two big children (whole)", { a: big(30_000), b: big(30_000) }, false],
  ["small doc (whole)", { a: [1, 2, 3] }, false],
];
for (const [name, v, chunked] of shapes) {
  const src = JSON.stringify(v);
  const { text, parts } = roundTrip(src);
  check(`${name}: identical`, text === JSON.stringify(JSON.parse(src)), `(${text.length} vs ${src.length})`);
  check(`${name}: chunked=${chunked}`, (parts > 0) === chunked, `parts=${parts}`);
}
{
  // "__proto__" stays an own key after reassembly.
  const src = `{${Array.from({ length: 70_000 }, (_, i) => `"k${i}":{"v":${i}}`).join(",")},"__proto__":{"evil":1}}`;
  const { skeleton, parts } = splitForTransfer(JSON.parse(src), 5_000_000);
  const value = structuredClone(skeleton) as Record<string, unknown>;
  for (const p of parts) applyPart(value, structuredClone(p));
  check("__proto__ own key", Object.prototype.hasOwnProperty.call(value, "__proto__") && Object.getPrototypeOf(value) === Object.prototype);
  check("__proto__ order", JSON.stringify(value) === JSON.stringify(JSON.parse(src)));
}

console.log("── sliced passes ──");
const texts = [
  "",
  "x",
  "a\nb\n",
  JSON.stringify(big(20_000), null, 2),
  // Surrogate pairs straddling every chunk boundary, plus lone surrogates.
  "😀".repeat(400_000) + "\uD800" + "a".repeat(262_143) + "😀\n\uDC00".repeat(1000),
];
for (const [i, t] of texts.entries()) {
  check(`bytes #${i}`, drain(byteLengthSteps(t)) === byteLength(t));
  const parts = drain(encodeUtf8Steps(t));
  const joined = Buffer.concat(parts);
  check(`encode #${i}`, Buffer.compare(joined, Buffer.from(new TextEncoder().encode(t))) === 0);
  check(`lines #${i}`, drain(lineCountSteps(t)) === (t ? t.split("\n").length : 0));
}
for (const v of [null, 1, "s", [], {}, big(30_000), { a: { b: { c: [[[]]] } }, d: [1, "x", null, true] }]) {
  const a = JSON.stringify(drain(computeStatsSteps(v)));
  const b = JSON.stringify(computeStats(v));
  check(`stats ${JSON.stringify(v).slice(0, 20)}`, a === b, `${a} vs ${b}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
