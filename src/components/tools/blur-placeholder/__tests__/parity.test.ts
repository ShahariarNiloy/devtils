/**
 * Parity: our ThumbHash and BlurHash ports against the real npm packages.
 * The packages are NOT app dependencies; install them in a scratch folder
 * and point BP_REF_DIR at it:
 *
 *   mkdir -p /tmp/bp-ref && cd /tmp/bp-ref && npm init -y && npm i thumbhash blurhash
 *   BP_REF_DIR=/tmp/bp-ref npx tsx src/components/tools/blur-placeholder/__tests__/parity.test.ts
 *
 * Without the packages it says so and exits 0; the golden vectors in
 * lib.test.ts still guard the output.
 *
 * Optional: BP_DESIGN_HTML=<BlurPlaceholder.dc.html> adds the design's three
 * real sample images (photo, studio product, transparent logo).
 */

/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { decodeBlurhash, encodeBlurhash } from "../blurhash";
import { DEFAULT_SETTINGS, generate, resize, fitDims, adjust, PAGE_BG } from "../blur-placeholder.lib";
import { rgbaToThumbHash, thumbHashToDataURL, thumbHashToRGBA } from "../thumbhash";
import { FIXTURES, type Fixture } from "./fixtures";

interface ThumbhashPkg {
  rgbaToThumbHash(w: number, h: number, rgba: ArrayLike<number>): Uint8Array;
  thumbHashToRGBA(hash: ArrayLike<number>): { w: number; h: number; rgba: Uint8Array };
  thumbHashToDataURL(hash: ArrayLike<number>): string;
}
interface BlurhashPkg {
  encode(px: Uint8ClampedArray, w: number, h: number, cx: number, cy: number): string;
  decode(hash: string, w: number, h: number, punch?: number): Uint8ClampedArray;
}

const refDir = process.env.BP_REF_DIR ?? "";

let pass = 0;
let fail = 0;
function ok(cond: boolean, name: string, detail?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.error(`✗ ${name}`, detail ?? "");
  }
}
const same = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

function designSamples(): Fixture[] {
  const p = process.env.BP_DESIGN_HTML;
  if (!p || !existsSync(p)) return [];
  const html = readFileSync(p, "utf8");
  const start = html.indexOf("var S = ");
  const line = html.slice(start + 8, html.indexOf("\n", start)).trim().replace(/;$/, "");
  const data = JSON.parse(line) as Record<string, { label: string; sw: number; sh: number; px: string }>;
  return Object.values(data).map((s) => ({
    name: `design ${s.label} ${s.sw}×${s.sh}`,
    w: s.sw,
    h: s.sh,
    px: new Uint8ClampedArray(Buffer.from(s.px, "base64")),
  }));
}

async function main() {
  const thPath = join(refDir, "node_modules/thumbhash/thumbhash.js");
  const bhPath = join(refDir, "node_modules/blurhash/dist/esm/index.js");
  if (!refDir || !existsSync(thPath) || !existsSync(bhPath)) {
    console.log(`parity: reference packages not found in ${refDir} — skipped (set BP_REF_DIR)`);
    return;
  }
  const TH = (await import(pathToFileURL(thPath).href)) as ThumbhashPkg;
  const BH = (await import(pathToFileURL(bhPath).href)) as BlurhashPkg;

  const images = [...FIXTURES, ...designSamples()];
  let thCount = 0;
  let bhCount = 0;
  for (const f of images) {
    // ThumbHash on the working pixels
    const ours = rgbaToThumbHash(f.w, f.h, f.px);
    const theirs = TH.rgbaToThumbHash(f.w, f.h, f.px);
    ok(same(ours, theirs), `thumbhash encode ${f.name}`, { ours: Array.from(ours), theirs: Array.from(theirs) });
    const dOurs = thumbHashToRGBA(ours);
    const dTheirs = TH.thumbHashToRGBA(theirs);
    ok(dOurs.w === dTheirs.w && dOurs.h === dTheirs.h && same(dOurs.rgba, dTheirs.rgba), `thumbhash decode ${f.name}`);
    ok(thumbHashToDataURL(ours) === TH.thumbHashToDataURL(theirs), `thumbHashToDataURL ${f.name}`);
    thCount++;

    // BlurHash on a 32px resize, every component count combo in a sweep
    const d = fitDims(f.w, f.h, 32);
    const small = adjust(resize(f.px, f.w, f.h, d.w, d.h), { brightness: 1, saturation: 1, hue: 0, lightness: 0 }, true, PAGE_BG);
    for (const [cx, cy] of [
      [1, 1],
      [4, 3],
      [3, 4],
      [9, 9],
      [1, 9],
      [6, 2],
    ]) {
      const a = encodeBlurhash(small, d.w, d.h, cx, cy);
      const b = BH.encode(small, d.w, d.h, cx, cy);
      ok(a === b, `blurhash encode ${f.name} ${cx}×${cy}`, { a, b });
      ok(same(decodeBlurhash(a, d.w, d.h), BH.decode(b, d.w, d.h)), `blurhash decode ${f.name} ${cx}×${cy}`);
      bhCount++;
    }

    // Full pipeline at default settings: the shown values are the packages' output
    const r = generate({ id: f.name, label: "x.png", w: f.w, h: f.h, bytes: 1000, sw: f.w, sh: f.h, px: f.px }, DEFAULT_SETTINGS);
    const full = adjust(f.px, DEFAULT_SETTINGS, false, PAGE_BG);
    ok(r.th === Buffer.from(TH.rgbaToThumbHash(f.w, f.h, full)).toString("base64"), `pipeline thumbhash ${f.name}`);
    ok(r.thPng === TH.thumbHashToDataURL(TH.rgbaToThumbHash(f.w, f.h, full)), `pipeline thumbhash preview ${f.name}`);
    const bd = fitDims(f.w, f.h, 32);
    let bsrc = resize(full, f.w, f.h, bd.w, bd.h);
    if (r.alpha) bsrc = adjust(bsrc, { brightness: 1, saturation: 1, hue: 0, lightness: 0 }, true, PAGE_BG);
    ok(r.blurhash === BH.encode(bsrc, bd.w, bd.h, 4, 3), `pipeline blurhash ${f.name}`);
  }

  // Random sweep: 200 random images of random sizes ≤ 100
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let n = 0; n < 200; n++) {
    const w = 1 + Math.floor(rnd() * 100);
    const h = 1 + Math.floor(rnd() * 100);
    const px = new Uint8ClampedArray(w * h * 4);
    const alpha = rnd() < 0.3;
    for (let i = 0; i < px.length; i++) px[i] = i % 4 === 3 && !alpha ? 255 : Math.floor(rnd() * 256);
    const a = rgbaToThumbHash(w, h, px);
    ok(same(a, TH.rgbaToThumbHash(w, h, px)), `thumbhash random ${w}×${h}${alpha ? " α" : ""}`);
    const cx = 1 + Math.floor(rnd() * 9);
    const cy = 1 + Math.floor(rnd() * 9);
    const bw = Math.min(w, 32);
    const bh = Math.min(h, 32);
    const bpx = px.subarray(0, bw * bh * 4);
    ok(encodeBlurhash(bpx, bw, bh, cx, cy) === BH.encode(bpx, bw, bh, cx, cy), `blurhash random ${bw}×${bh} ${cx}×${cy}`);
    thCount++;
    bhCount++;
  }

  console.log(`parity: ${images.length} images + 200 random; ${thCount} thumbhash cases, ${bhCount} blurhash cases`);
}

main().then(() => {
  console.log(`blur-placeholder parity: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
});
