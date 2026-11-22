/**
 * Blur placeholder — pure pipeline tests: area-average resize, modulate()
 * semantics, the PNG encoder (decoded back with node:zlib + a reference
 * unfilter), CSS / SVG output, code snippets, the batch manifest, and golden
 * ThumbHash / BlurHash vectors recorded from the npm packages (parity.test.ts
 * re-checks them live against the packages when they're available).
 *
 * Run: npx tsx src/components/tools/blur-placeholder/__tests__/lib.test.ts
 */

/* eslint-disable no-console */

import { inflateSync } from "node:zlib";
import {
  DEFAULT_SETTINGS,
  FORMATS,
  adjust,
  average,
  baseDims,
  slimDataUrl,
  slimJpeg,
  slimWebp,
  buildCode,
  buildManifest,
  fitDims,
  generate,
  hasTransparency,
  hex,
  kb,
  modulate,
  pctOf,
  resize,
  svgToDataUrl,
  valueOf,
  workingDims,
  type OutTab,
  type Settings,
  type SourceImage,
} from "../blur-placeholder.lib";
import { decodeBlurhash, isBlurhashValid } from "../blurhash";
import { crc32, encodePng } from "../png";
import { FIXTURES } from "./fixtures";

let pass = 0;
let fail = 0;
function ok(cond: boolean, name: string, detail?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.error(`✗ ${name}`, detail ?? "");
  }
}
const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

const src = (name: string, w: number, h: number, px: Uint8ClampedArray): SourceImage => ({
  id: name,
  label: name + ".png",
  w: w * 10,
  h: h * 10,
  bytes: 20000,
  sw: w,
  sh: h,
  px,
});

/* ---------- reference PNG decoder (zlib = node's inflate) ---------- */
function decodePng(bytes: Uint8Array): { w: number; h: number; ch: number; px: number[]; crcOk: boolean } {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig.every((b, i) => bytes[i] === b)) throw new Error("bad signature");
  let p = 8;
  let w = 0;
  let h = 0;
  let ch = 0;
  let crcOk = true;
  const idat: number[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (;;) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    const data = bytes.subarray(p + 8, p + 8 + len);
    const crc = dv.getUint32(p + 8 + len);
    if (crc32(bytes, p + 4, p + 8 + len) !== crc) crcOk = false;
    if (type === "IHDR") {
      w = dv.getUint32(p + 8);
      h = dv.getUint32(p + 12);
      if (data[8] !== 8) throw new Error("bit depth");
      ch = ({ 6: 4, 2: 3 } as Record<number, number>)[data[9]] ?? 0;
    } else if (type === "IDAT") idat.push(...data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.from(idat));
  const stride = w * ch;
  const out: number[] = [];
  const prev = new Array<number>(stride).fill(0);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line: number[] = [];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      const pp = a + b - c;
      const pa = Math.abs(pp - a);
      const pb = Math.abs(pp - b);
      const pc = Math.abs(pp - c);
      let paeth = c;
      if (pa <= pb && pa <= pc) paeth = a;
      else if (pb <= pc) paeth = b;
      const pred = [0, a, b, (a + b) >> 1, paeth][f];
      line.push((v + pred) & 255);
    }
    out.push(...line);
    for (let x = 0; x < stride; x++) prev[x] = line[x];
  }
  return { w, h, ch, px: out, crcOk };
}

/* ---------- resize ---------- */
{
  // 2×2 → 1×1 averages
  const px = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 100, 0, 0, 255, 0, 100, 0, 255]);
  const r = resize(px, 2, 2, 1, 1);
  ok(r[0] === 89 && r[1] === 89 && r[2] === 64 && r[3] === 255, "resize 2×2 → 1×1 area average", Array.from(r));
  // Transparent pixels don't bleed colour
  const t = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 0]);
  const rt = resize(t, 2, 1, 1, 1);
  ok(rt[0] === 255 && rt[1] === 0 && near(rt[3], 128, 1), "resize is alpha-weighted (no green bleed)", Array.from(rt));
  // Identity size is exact
  const f = FIXTURES[0];
  const same = resize(f.px, f.w, f.h, f.w, f.h);
  ok(same.every((v, i) => v === f.px[i]), "resize to the same size is exact");
  // Fractional ratio keeps mean colour
  const s = resize(f.px, f.w, f.h, 7, 5);
  const m0 = average(f.px);
  const m1 = average(s);
  ok(m0.every((v, i) => near(v, m1[i], 1)), "fractional resize preserves the mean", { m0, m1 });
}

/* ---------- dims ---------- */
ok(JSON.stringify(fitDims(960, 600, 8)) === '{"w":8,"h":5}', "fitDims landscape 8px");
ok(JSON.stringify(fitDims(600, 960, 8)) === '{"w":5,"h":8}', "fitDims portrait 8px");
ok(JSON.stringify(fitDims(1, 1, 8)) === '{"w":1,"h":1}', "fitDims never upscales");
ok(JSON.stringify(fitDims(1000, 10, 8)) === '{"w":8,"h":1}', "fitDims keeps ≥1px");
ok(JSON.stringify(baseDims(960, 600, 4)) === '{"w":4,"h":3}', "baseDims 4px wide, landscape");
ok(JSON.stringify(baseDims(600, 960, 4)) === '{"w":4,"h":6}', "baseDims 4px wide, portrait (height by aspect)");
ok(JSON.stringify(baseDims(10, 1000, 8)) === '{"w":8,"h":64}', "baseDims caps height at 64");
ok(JSON.stringify(baseDims(2, 100, 8)) === '{"w":2,"h":64}', "baseDims never upscales");
ok(DEFAULT_SETTINGS.size === 4 && DEFAULT_SETTINGS.fmt === "png", "defaults: 4px PNG");
ok(JSON.stringify(workingDims(6000, 4000)) === '{"w":100,"h":67}', "workingDims 24MP → 100×67");
ok(JSON.stringify(workingDims(40, 30)) === '{"w":40,"h":30}', "workingDims leaves small images alone");

/* ---------- modulate / adjust ---------- */
{
  const id = { brightness: 1, saturation: 1, hue: 0, lightness: 0 };
  const f = FIXTURES[0];
  const a = adjust(f.px, id, false, [0, 0, 0]);
  ok(a.every((v, i) => v === f.px[i]), "identity adjust is an exact pass-through");
  // Round trip through LCh with identity math is within rounding
  let maxErr = 0;
  for (let r = 0; r < 256; r += 15)
    for (let g = 0; g < 256; g += 15)
      for (let b = 0; b < 256; b += 15) {
        const c = modulate(r, g, b, id);
        maxErr = Math.max(maxErr, Math.abs(c[0] - r), Math.abs(c[1] - g), Math.abs(c[2] - b));
      }
  ok(maxErr < 0.01, "sRGB → LCh → sRGB round trip is lossless", maxErr);
  // Saturation leaves greys grey and lightness unchanged
  const grey = modulate(128, 128, 128, { ...id, saturation: 2 });
  ok(near(grey[0], 128, 0.01) && near(grey[1], 128, 0.01) && near(grey[2], 128, 0.01), "saturation keeps neutrals", grey);
  // Saturation 0 → neutral grey of the same L
  const desat = modulate(200, 60, 40, { ...id, saturation: 0 });
  ok(near(desat[0], desat[1], 0.01) && near(desat[1], desat[2], 0.01), "saturation 0 is grey", desat);
  // Hue 360 ≈ identity, hue 180 flips a/b
  const h360 = modulate(200, 60, 40, { ...id, hue: 360 });
  ok(near(h360[0], 200, 0.01) && near(h360[1], 60, 0.01) && near(h360[2], 40, 0.01), "hue +360° is identity", h360);
  const h180 = modulate(200, 60, 40, { ...id, hue: 180 });
  ok(h180[2] > h180[0], "hue +180° turns red-orange toward blue", h180);
  // Brightness multiplies L: black stays black, white clips
  const blk = modulate(0, 0, 0, { ...id, brightness: 1.5 });
  ok(blk.every((v) => v < 0.01), "brightness × keeps black", blk);
  const white = modulate(255, 255, 255, { ...id, brightness: 0.5 });
  ok(near(white[0], white[1], 0.01) && white[0] > 100 && white[0] < 130, "brightness 0.5 → L 50 grey (~119)", white);
  // Lightness is additive in L
  const lt = modulate(0, 0, 0, { ...id, lightness: 20 });
  ok(near(lt[0], 48, 1.5) && near(lt[0], lt[2], 0.01), "lightness +20 on black → L 20 grey (~48)", lt);
  // Flatten composites onto the background
  const fl = adjust(new Uint8ClampedArray([255, 255, 255, 0, 255, 0, 0, 128]), id, true, [10, 20, 30]);
  ok(
    fl[0] === 10 && fl[1] === 20 && fl[2] === 30 && fl[3] === 255 && near(fl[4], 133, 1) && fl[7] === 255,
    "flatten composites alpha onto bg",
    Array.from(fl),
  );
  // Alpha untouched when not flattening
  const keep = adjust(new Uint8ClampedArray([100, 50, 25, 77]), DEFAULT_SETTINGS, false, [0, 0, 0]);
  ok(keep[3] === 77, "adjust keeps alpha");
}

ok(hex([0, 15.6, 255]) === "#0010ff", "hex rounds before padding");
ok(kb(512) === "512 B" && kb(2048) === "2.0 KB" && kb(25573) === "25 KB", "kb()");
ok(pctOf(282, 25573) === "1.1% of the original" && pctOf(1, 1e6) === "< 0.01% of the original", "pctOf()");
ok(hasTransparency(FIXTURES[2].px) && !hasTransparency(FIXTURES[0].px), "hasTransparency");

/* ---------- PNG encoder ---------- */
for (const f of FIXTURES) {
  for (const alpha of [false, true]) {
    const d = fitDims(f.w, f.h, 64);
    const px = resize(f.px, f.w, f.h, d.w, d.h);
    const png = encodePng(d.w, d.h, px, alpha);
    const dec = decodePng(png);
    let exact = dec.w === d.w && dec.h === d.h && dec.ch === (alpha ? 4 : 3);
    for (let i = 0, j = 0; exact && i < px.length; i += 4) {
      for (let c = 0; c < dec.ch; c++, j++) if (dec.px[j] !== px[i + c]) exact = false;
    }
    ok(dec.crcOk, `png CRCs ${f.name} ${alpha ? "RGBA" : "RGB"}`);
    ok(exact, `png pixels round-trip exactly ${f.name} ${alpha ? "RGBA" : "RGB"}`);
  }
}
{
  // Compression actually helps on smooth images, and never exceeds stored by more than the header
  const flat = new Uint8ClampedArray(64 * 64 * 4).fill(200);
  const png = encodePng(64, 64, flat, false);
  ok(png.length < 300, "flat 64×64 compresses (fixed Huffman + LZ77)", png.length);
}

/* ---------- full pipeline ---------- */
const GOLDEN: Record<string, { th: string; bh: string; color: string }> = {
  "photo 100×62": { th: "nYcGLKSC+GGopIh3yomNX4j4eA==", bh: "L.Jh^Nsjs,wM{Mn-nSoKxDjbbZbr", color: "#964e7e" },
  "transparent logo 100×100": { th: "skmGFQI2gn+Id6h3d39393d3B2iHeICKZw==", bh: "LOHKzyd;00uPt6f6WBj]00k=~VQ,", color: "#f0c8a8" },
  "1×1": { th: "mAwzJ0EI9wiIh4hwj3CI+AiIgIAICIgA", bh: "L~OINX}o}o}o}o}o}o}o}o}o}o}o", color: "#d35100" },
  "extreme 100×3": { th: "HugGKZyVr3WXeHd3i1+H+Hc=", bh: "L~LJs$s8o1tM}vs8o1tM}vs8o1tM", color: "#b63e72" },
  "extreme 2×100": { th: "XJgGISRzmoiIj4h4jV9493c=", bh: "L~JYVT}]}]}][E[E[E[EwLwLwLwL", color: "#994f6c" },
};

for (const f of FIXTURES) {
  const s = src(f.name, f.w, f.h, f.px);
  const r = generate(s, DEFAULT_SETTINGS);
  const g = GOLDEN[f.name];
  if (g) {
    ok(r.th === g.th, `golden thumbhash ${f.name}`, r.th);
    ok(r.blurhash === g.bh, `golden blurhash ${f.name}`, r.blurhash);
    ok(r.color === g.color, `golden colour ${f.name}`, r.color);
  }
  ok(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(r.b64), `blurDataURL is a valid base64 PNG data URL ${f.name}`);
  const png = decodePng(new Uint8Array(Buffer.from(r.b64.split(",")[1], "base64")));
  ok(png.w === r.w && png.h === r.h && png.crcOk, `blurDataURL decodes to ${r.w}×${r.h} ${f.name}`);
  ok(png.ch === (r.alpha ? 4 : 3), `blurDataURL keeps alpha only when needed ${f.name}`);
  ok(isBlurhashValid(r.blurhash) && r.blurhash.length === 4 + 2 * 4 * 3, `blurhash shape ${f.name}`);
  ok(r.bhPng.startsWith("data:image/png;base64,") && r.thPng.startsWith("data:image/png;base64,"), `hash previews ${f.name}`);
  ok(/^#[0-9a-f]{6}$/.test(r.color), `colour is #rrggbb ${f.name}`);
  // CSS: one gradient row per grid row, sizes add up
  const rows = r.css.backgroundImage.split("linear-gradient(").length - 1;
  const grid = fitDims(f.w, f.h, 4);
  ok(rows === grid.h && r.css.backgroundPosition.split(",").length === grid.h, `css has ${grid.h} rows ${f.name}`);
  ok(r.cssText.includes("filter:blur(24px)") && r.cssText.startsWith("background-image:linear-gradient(90deg,"), `css text ${f.name}`);
  // SVG: well-formed, rect count = grid, encoded data URL decodes back
  const v = fitDims(f.w, f.h, 8);
  ok((r.svg.match(/<rect /g) ?? []).length === v.w * v.h, `svg has ${v.w}×${v.h} rects ${f.name}`);
  ok(decodeURIComponent(r.svgUrl.slice("data:image/svg+xml,".length)) === r.svg, `svg data URL round-trips ${f.name}`);
  ok(r.alpha === r.svg.includes("fill-opacity") || !r.alpha, `svg keeps alpha only when needed ${f.name}`);
  // Sizes shown = what's copied
  for (const fm of FORMATS) ok(valueOf(fm.id, r).length > 0, `value ${fm.id} ${f.name}`);
}

{
  // Flatten turns alpha off and fills
  const f = FIXTURES[2];
  const withFill = generate(src(f.name, f.w, f.h, f.px), { ...DEFAULT_SETTINGS, flatten: true, bg: "white" });
  ok(!withFill.alpha && withFill.hasAlpha, "flatten: output opaque, source still flagged transparent");
  const png = decodePng(new Uint8Array(Buffer.from(withFill.b64.split(",")[1], "base64")));
  ok(png.ch === 3 && png.px[0] === 255 && png.px[1] === 255 && png.px[2] === 255, "flatten white: corner is white", png.px.slice(0, 3));
  // JPEG/WebP without a browser encoder falls back to PNG, honestly flagged
  const jp = generate(src(f.name, f.w, f.h, f.px), { ...DEFAULT_SETTINGS, fmt: "webp" });
  ok(jp.b64Fmt === "png" && jp.b64.startsWith("data:image/png"), "no lossy encoder → PNG, b64Fmt says so");
  // Lossy encoder is called with flattened pixels for JPEG
  let sawAlpha = -1;
  const fake = (w: number, h: number, px: Uint8ClampedArray, mime: string) => {
    sawAlpha = px[3];
    return `data:${mime};base64,AAAA`;
  };
  const j = generate(src(f.name, f.w, f.h, f.px), { ...DEFAULT_SETTINGS, fmt: "jpeg" }, fake);
  ok(j.b64Fmt === "jpeg" && j.b64 === "data:image/jpeg;base64,AAAA" && sawAlpha === 255, "JPEG gets filled pixels");
  const bad = generate(src(f.name, f.w, f.h, f.px), { ...DEFAULT_SETTINGS, fmt: "webp" }, () => "data:image/png;base64,AAAA");
  ok(bad.b64Fmt === "png", "browser returning PNG for WebP is reported as PNG");
  // Size setting changes dims
  const def = generate(src("p", 100, 62, FIXTURES[0].px), DEFAULT_SETTINGS);
  ok(def.w === 4 && def.h === 2 && def.b64 === def.b64 && def.fmtLengths.png === def.b64.length, "default 4px PNG, length reported", [def.w, def.h, def.b64.length]);
  ok(def.fmtLengths.webp === null && def.fmtLengths.jpeg === null, "no browser encoder → no lossy lengths");
  const big = generate(src("p", 100, 62, FIXTURES[0].px), { ...DEFAULT_SETTINGS, size: 24 });
  ok(big.w === 24 && big.h === 15, "size 24 → 24×15", [big.w, big.h]);
  // BlurHash components
  const comp: Settings = { ...DEFAULT_SETTINGS, bx: 9, by: 1 };
  const bh = generate(src("p", 100, 62, FIXTURES[0].px), comp).blurhash;
  ok(bh.length === 4 + 2 * 9 && decodeBlurhash(bh, 4, 4).length === 64, "blurhash 9×1 components");
}

/* ---------- WebP / JPEG slimming ---------- */
{
  const le = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const chunk = (t: string, d: number[]) => [...t].map((c) => c.charCodeAt(0)).concat(le(d.length), d, d.length & 1 ? [0] : []);
  const riff = (chunks: number[][]) => {
    const body = [87, 69, 66, 80, ...chunks.flat()];
    return new Uint8Array([82, 73, 70, 70, ...le(body.length), ...body]);
  };
  const vp8 = Array.from({ length: 62 }, (_, i) => (i * 37) & 255);
  const fat = riff([chunk("VP8X", [0x20, 0, 0, 0, 3, 0, 0, 2, 0, 0]), chunk("ICCP", new Array(456).fill(7)), chunk("VP8 ", vp8)]);
  const slim = slimWebp(fat);
  const expect = riff([chunk("VP8 ", vp8)]);
  ok(slim.length === expect.length && slim.every((v, i) => v === expect[i]), "slimWebp: opaque → simple RIFF+VP8, ICC gone", slim.length);
  const withAlpha = riff([chunk("VP8X", [0x30, 0, 0, 0, 3, 0, 0, 2, 0, 0]), chunk("ICCP", [1, 2, 3]), chunk("ALPH", [9, 9, 9]), chunk("VP8 ", vp8)]);
  const sa = slimWebp(withAlpha);
  const s4 = String.fromCharCode(...sa.subarray(12, 16));
  ok(s4 === "VP8X" && (sa[20] & 0x20) === 0 && (sa[20] & 0x10) !== 0 && !String.fromCharCode(...sa).includes("ICCP"), "slimWebp keeps VP8X+ALPH, clears ICC flag");
  ok(new DataView(sa.buffer).getUint32(4, true) === sa.length - 8, "slimWebp RIFF size is right");
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2, 0xff, 0xe2, 0, 5, 1, 2, 3, 0xff, 0xdb, 0, 3, 9, 0xff, 0xda, 0, 2, 5, 6, 0xff, 0xd9]);
  const sj = slimJpeg(jpg);
  ok(Array.from(sj).join() === [0xff, 0xd8, 0xff, 0xdb, 0, 3, 9, 0xff, 0xda, 0, 2, 5, 6, 0xff, 0xd9].join(), "slimJpeg drops APP0/APP2", Array.from(sj));
  ok(slimDataUrl("data:image/png;base64,AAAA") === "data:image/png;base64,AAAA", "slimDataUrl leaves PNG alone");
}

/* ---------- code ---------- */
{
  const f = FIXTURES[0];
  const item = src("lake sunset", f.w, f.h, f.px);
  const r = generate(item, DEFAULT_SETTINGS);
  const tabs: OutTab[] = ["next", "react", "html", "value"];
  for (const fm of FORMATS)
    for (const t of tabs) {
      const code = buildCode(t, fm.id, item, r);
      ok(code.length > 0, `code ${t}/${fm.id}`);
      if (t === "value") ok(code === valueOf(fm.id, r), `raw value = value ${fm.id}`);
      if (t !== "value" && !(t === "html" && (fm.id === "thumbhash" || fm.id === "blurhash"))) ok(code.includes("/images/lake%20sunset.png"), `code uses an encoded src ${t}/${fm.id}`);
    }
  ok(buildCode("next", "base64", item, r).includes(`blurDataURL="${r.b64}"`), "next/base64 has blurDataURL");
  ok(buildCode("next", "svg", item, r).includes(`placeholder="data:image/svg+xml,`), "next/svg uses data URL placeholder");
  ok(buildCode("html", "thumbhash", item, r).includes("c.width = w;"), "html/thumbhash sizes the canvas from the hash");
  ok(!/[<>]/.test(svgToDataUrl("<svg/>").slice(5)), "svg data URL has no raw angle brackets");
}

/* ---------- manifest ---------- */
{
  const rows = FIXTURES.slice(0, 3).map((f) => {
    const item = src("same", f.w, f.h, f.px);
    return { item, result: generate(item, DEFAULT_SETTINGS) };
  });
  const m = buildManifest(rows);
  const keys = Object.keys(m);
  ok(JSON.stringify(keys) === '["same.png","same.png (2)","same.png (3)"]', "manifest dedupes names", keys);
  const e = m["same.png"];
  ok(
    JSON.stringify(Object.keys(e)) === '["width","height","blurDataURL","color","blurhash","thumbhash"]' &&
      e.width === 1000 &&
      e.blurDataURL === rows[0].result.b64,
    "manifest entry shape",
    e,
  );
  ok(JSON.parse(JSON.stringify(m))["same.png (2)"].thumbhash === rows[1].result.th, "manifest round-trips as JSON");
}

console.log(`blur-placeholder lib: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
