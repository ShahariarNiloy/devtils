/**
 * Tests for the landing "Paste anything" detector.
 *
 * Run: npx tsx src/components/home/__tests__/paste-detect.test.ts
 */

/* eslint-disable no-console */

import { getToolBySlug } from "../../../lib/tools-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "../../../lib/implemented-tools";
import { cronWords, detect, MAX_INSPECT, PREVIEW_MAX, SAMPLES, type Detection } from "../paste-detect.lib";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, hint?: unknown) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${hint === undefined ? "" : ` — ${JSON.stringify(hint)}`}`);
  }
}
const fact = (d: Detection | null, k: string) => d?.facts.find((f) => f.k === k)?.v;
const NOW = Date.UTC(2026, 10, 21);
const sample = (key: string) => SAMPLES.find((s) => s.key === key)?.value ?? "";

console.log("samples");
const expectKind: Record<string, string> = { json: "json", jwt: "jwt", b64: "base64", url: "url", ts: "timestamp", cron: "cron", color: "color" };
for (const s of SAMPLES) {
  const d = detect(s.value, NOW);
  check(`${s.label} sample → ${expectKind[s.key]}`, d?.kind === expectKind[s.key], d?.kind);
  check(`${s.label} sample → live tool ${d?.slug}`, !!d && !!getToolBySlug(d.slug) && IMPLEMENTED_TOOL_SLUGS.has(d.slug));
}

console.log("empty");
check("empty → null", detect("") === null);
check("whitespace → null", detect("   \n\t ") === null);

console.log("json");
const j = detect(sample("json"), NOW);
check("top level", fact(j, "Top level") === "object · 3 keys", fact(j, "Top level"));
check("depth", fact(j, "Depth") === "3", fact(j, "Depth"));
check("pretty preview", j?.preview.startsWith('{\n  "user"') === true);
check("array", fact(detect("[1,2,3]"), "Top level") === "array · 3 items");
const bad = detect('{"a": 1,}');
check("broken JSON → json-error", bad?.kind === "json-error" && bad.confidence === "Likely", bad);
check("broken JSON problem fact", !!fact(bad, "Problem") && !/\(line/.test(fact(bad, "Problem") ?? ""));
let deep = "1";
for (let i = 0; i < 3000; i++) deep = `[${deep}]`;
check("deep nesting does not overflow", fact(detect(deep), "Depth") === "3000", fact(detect(deep), "Depth"));
const huge = `[${"1,".repeat(MAX_INSPECT)}1]`;
const hd = detect(huge);
check("over cap → JSON Likely, not parsed", hd?.kind === "json" && hd.confidence === "Likely");
check("preview is capped", (hd?.preview.length ?? 0) <= PREVIEW_MAX + 1);

console.log("jwt");
const t = detect(sample("jwt"), NOW);
check("alg", fact(t, "Algorithm") === "HS256");
check("sub", fact(t, "Subject") === "4821");
check("exp in future → not expired", fact(t, "Expires") === "2027-12-28 13:20 UTC", fact(t, "Expires"));
const later = detect(sample("jwt"), Date.UTC(2030, 0, 1));
check("exp in past → expired", fact(later, "Expires")?.endsWith("· expired") === true, fact(later, "Expires"));
check("payload preview", t?.preview.includes('"name": "Ada"') === true);
check("garbage JWT-shaped → not jwt", detect("eyJhbGc.eyJzdWI.abc")?.kind !== "jwt");

console.log("url");
const u = detect(sample("url"));
check("host", fact(u, "Host") === "shop.example.com");
check("path", fact(u, "Path") === "/search");
check("params + tracking", fact(u, "Parameters") === "4 · 2 tracking", fact(u, "Parameters"));
check("no params preview", detect("https://example.com/")?.preview === "(no query parameters)");

console.log("timestamp");
const ts = detect("1795196384");
check("seconds", fact(ts, "Unit") === "seconds");
check("utc", fact(ts, "UTC") === "2026-11-20 17:39:44", fact(ts, "UTC"));
const yourTime = ts?.rows.find((r) => r.k === "Your time")?.v ?? "";
check("local time in preview rows", /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d UTC/.test(yourTime), yourTime);
check("timestamp rows: ISO + ms", ts?.rows.some((r) => r.k === "ISO 8601") === true && ts?.rows.some((r) => r.k === "Milliseconds") === true);
const objRows = detect('{"user":{"id":1},"tags":["a"],"ok":true,"n":null}');
check("JSON rows summarise values", objRows?.previewLabel === "Top-level keys" &&
  objRows.rows.map((r) => `${r.k}=${r.v}:${r.tone}`).join(",") === "user={1 keys}:plain,tags=[1 items]:plain,ok=true:boolean,n=null:null", objRows?.rows);
check("colour gets a swatch", detect("#e0a072")?.swatch === "#e0a072");
check("milliseconds", fact(detect("1795196384000"), "Unit") === "milliseconds");

console.log("uuid");
check("uuid v4", fact(detect("3F2504E0-4F89-41D3-9A0C-0305E82C3301"), "Version") === "v4");

console.log("colour");
const c = detect("#e0a072");
check("hex → rgb", fact(c, "RGB") === "rgb(224, 160, 114)", fact(c, "RGB"));
check("short hex", fact(detect("#fff"), "HEX") === "#ffffff");
check("rgb() → hex", fact(detect("rgb(224, 160, 114)"), "HEX") === "#e0a072");
check("rgb space syntax", fact(detect("rgb(224 160 114 / 50%)"), "HEX") === "#e0a072");
check("hsl() → hex", fact(detect("hsl(0, 100%, 50%)"), "HEX") === "#ff0000", fact(detect("hsl(0, 100%, 50%)"), "HEX"));
check("hsl fact", fact(c, "HSL") === "hsl(25 64% 66%)", fact(c, "HSL"));
check("rgb out of range → not colour", detect("rgb(300, 0, 0)")?.kind !== "color");

console.log("cron");
check("words", cronWords("*/15 9-17 * * 1-5".split(" ")) === "Every 15 minutes, from 09:00 to 17:59, on weekdays");
check("daily at", cronWords("30 2 * * *".split(" ")) === "At 02:30");
check("weekday name", cronWords("0 9 * * 1".split(" ")) === "At 09:00, on Mondays");
check("cron preview", detect("*/15 9-17 * * 1-5")?.preview === "Every 15 minutes, from 09:00 to 17:59, on weekdays");

console.log("base64");
const b = detect(sample("b64"));
check("decoded preview", b?.preview === "hello from utilyx - nothing uploaded", b?.preview);
check("binary base64 → not base64", detect("AAECAwQFBgcICQ==")?.kind !== "base64", detect("AAECAwQFBgcICQ==")?.kind);
check("random word → text", detect("keyboards")?.kind === "text", detect("keyboards")?.kind);

console.log("text");
const p = detect("hello there  world");
check("plain text words", fact(p, "Words") === "3" && p?.confidence === "Guess");

console.log("speed");
const big = JSON.stringify({ rows: Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `row ${i}`, tags: ["a", "b"] })) });
const t0 = performance.now();
for (let i = 0; i < 50; i++) detect(big);
const per = (performance.now() - t0) / 50;
console.log(`    ${big.length} chars JSON: ${per.toFixed(2)} ms / detect`);
check("~100 KB JSON detect under 16 ms", big.length > 80_000 && big.length <= MAX_INSPECT && per < 16, per);
const t1 = performance.now();
for (let i = 0; i < 1000; i++) detect(sample("jwt"));
check("JWT detect under 0.2 ms", (performance.now() - t1) / 1000 < 0.2);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
