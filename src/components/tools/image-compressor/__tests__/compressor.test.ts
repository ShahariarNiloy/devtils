/**
 * Unit tests for the image compressor's pure parts: quality scale, size-
 * budget search (fake encoder), Auto selection (transparency + colour
 * rules), the never-bigger merge, the <img> snippet, starting points,
 * EXIF summary and file naming.
 *
 * Run: npx tsx src/components/tools/image-compressor/__tests__/compressor.test.ts
 */

/* eslint-disable no-console */

import { autoFormats, mergeCandidates, pickAuto, shouldKeepOriginal } from "../image-compressor.auto";
import { readExifSummary } from "../image-compressor.exif";
import { createDefaultSettings, ESTIMATE_MAX_PIXELS, makeEstimateSample } from "../image-compressor.lib";
import { QUALITY_MODE_DEFS } from "../image-compressor.modes";
import {
  BUDGET_MAX_PROBES,
  budgetRange,
  codecQualityFor,
  jpegScaleOf,
  qualityForCodec,
  searchBudget,
  sliderValue,
} from "../image-compressor.quality";
import { imgSnippet } from "../image-compressor.snippet";
import { STARTING_POINTS } from "../image-compressor.starts";
import { barPick, collectOverrides, effectiveSettings, overrideFor } from "../image-compressor.overrides";
import { mergeSettings, useCompressorStore } from "../image-compressor.store";
import type { CandidateSummary, CompressionResult, CompressionSettings, ImageFile } from "../image-compressor.types";
import { changedSettingsCount, maxWidthOf, outputFileName, uniqueNames } from "../image-compressor.view";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, hint?: string): void {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${hint ? ` — ${hint}` : ""}`);
  }
}

async function main() {
  // ── Quality scale ────────────────────────────────────────────────
  console.log("quality scale");
  for (const mode of ["small", "high", "maximum"] as const) {
    const def = QUALITY_MODE_DEFS[mode];
    const x = def.quality.jpeg;
    check(`${mode}: JPEG ${x} ↔ WebP ${def.quality.webp} ↔ AVIF ${def.quality.avif}`,
      codecQualityFor("webp", x) === def.quality.webp && codecQualityFor("avif", x) === def.quality.avif);
  }
  check("jpegScaleOf inverts codecQualityFor", [20, 45, 60, 70, 75, 82, 90, 97].every((x) => Math.abs(jpegScaleOf("avif", codecQualityFor("avif", x)) - x) <= 1.5));
  check("monotonic in x", [10, 30, 50, 70, 90].every((x, i, a) => i === 0 || codecQualityFor("avif", x) >= codecQualityFor("avif", a[i - 1])));
  const base = createDefaultSettings();
  check("Balanced per codec = mode table", qualityForCodec("jpeg", base) === 75 && qualityForCodec("webp", base) === 80 && qualityForCodec("avif", base) === 60);
  const webp85: CompressionSettings = { ...base, outputFormat: "image/webp", qualityMode: "custom", customQuality: 85 };
  check("custom on picked codec's scale is raw (WebP 85)", qualityForCodec("webp", webp85) === 85);
  check("other codecs get the equivalent (AVIF < 85)", qualityForCodec("avif", webp85) < 85 && qualityForCodec("avif", webp85) > 60);
  check("slider shows the mode value on the picked scale", sliderValue({ ...base, outputFormat: "image/webp" }) === 80 && sliderValue(base) === 75);
  const r = budgetRange("avif");
  check("AVIF budget range floor < ceil = Best", r.min < r.max && r.max === QUALITY_MODE_DEFS.maximum.quality.avif);

  // ── Budget search (fake encoder) ─────────────────────────────────
  console.log("budget search");
  const fake = (k: number, noise = 0) => {
    let calls = 0;
    const fn = async (q: number) => {
      calls++;
      const jitter = noise ? Math.sin(q * 12.9898) * noise : 0;
      const size = Math.round(k * Math.exp(q / 18) * (1 + jitter));
      return { size, value: `q${q}` };
    };
    return { fn, calls: () => calls };
  };
  const sizeAt = (k: number, q: number) => Math.round(k * Math.exp(q / 18));
  {
    const f = fake(400);
    const budget = 60_000;
    const out = await searchBudget(f.fn, budget, { min: 30, max: 90, start: 75 });
    const exact = Array.from({ length: 61 }, (_, i) => 30 + i).filter((q) => sizeAt(400, q) <= budget).pop() ?? -1;
    check(`finds highest fitting q (${out.chosen.q} vs exact ${exact})`, out.fits && out.chosen.size <= budget && exact - out.chosen.q <= 2);
    check(`≤ ${BUDGET_MAX_PROBES} encodes (used ${f.calls()})`, f.calls() <= BUDGET_MAX_PROBES && out.probes === f.calls());
  }
  for (const budget of [5_000, 20_000, 100_000, 400_000, 2_000_000]) {
    const f = fake(400);
    const out = await searchBudget(f.fn, budget, { min: 30, max: 90, start: 60 });
    const exact = Array.from({ length: 61 }, (_, i) => 30 + i).filter((q) => sizeAt(400, q) <= budget).pop();
    if (exact === undefined) {
      check(`budget ${budget}: can't fit → smallest (min q) flagged`, !out.fits && out.chosen.q === 30 && f.calls() <= 2);
    } else {
      check(`budget ${budget}: q${out.chosen.q} (exact ${exact}) within 2, ≤7 encodes (${f.calls()})`,
        out.fits && out.chosen.size <= budget && exact - out.chosen.q <= 2 && f.calls() <= BUDGET_MAX_PROBES);
    }
  }
  {
    const f = fake(400);
    const out = await searchBudget(f.fn, 1e12, { min: 30, max: 90, start: 75 });
    check("everything fits → max quality in 2 encodes", out.fits && out.chosen.q === 90 && f.calls() === 2);
  }
  {
    const f = fake(400, 0.04);
    const budget = 50_000;
    const out = await searchBudget(f.fn, budget, { min: 30, max: 90, start: 75 });
    check("non-monotonic encoder: still never over budget", out.fits && out.chosen.size <= budget);
  }
  {
    let cancelled = false;
    const f = fake(400);
    const p = searchBudget(async (q) => { cancelled = true; return f.fn(q); }, 50_000, { min: 30, max: 90, start: 75, isCancelled: () => cancelled });
    let threw = false;
    try { await p; } catch { threw = true; }
    check("cancellable between probes", threw && f.calls() === 1);
  }

  // ── Auto selection ───────────────────────────────────────────────
  console.log("auto");
  check("alpha skips JPEG", !autoFormats({ hasAlpha: true, width: 800, height: 600 }).includes("image/jpeg"));
  check("opaque tries AVIF, WebP, JPEG", autoFormats({ hasAlpha: false, width: 800, height: 600 }).length === 3);
  check("past 16383px drops WebP", !autoFormats({ hasAlpha: false, width: 20000, height: 10 }).includes("image/webp"));
  check("split job for JPEG on alpha → nothing", autoFormats({ hasAlpha: true, width: 10, height: 10 }, ["image/jpeg"]).length === 0);
  const c = (mimeType: CandidateSummary["mimeType"], size: number, extra: Partial<CandidateSummary> = {}): CandidateSummary => ({ mimeType, size, quality: 70, fits: null, iccStatus: "none", ...extra });
  check("quality goal: smallest wins", pickAuto([c("image/jpeg", 900), c("image/webp", 700), c("image/avif", 500)], "quality")?.mimeType === "image/avif");
  check("colour first: profile-dropping AVIF loses to colour-correct JPEG",
    pickAuto([c("image/jpeg", 900, { iccStatus: "preserved" }), c("image/avif", 400, { iccStatus: "lost" })], "quality")?.mimeType === "image/jpeg");
  check("all lose colour → smallest (UI warns)", pickAuto([c("image/webp", 900, { iccStatus: "lost" }), c("image/avif", 400, { iccStatus: "lost" })], "quality")?.mimeType === "image/avif");
  check("P3 converted counts as colour-correct", pickAuto([c("image/jpeg", 900, { iccStatus: "preserved" }), c("image/webp", 500, { iccStatus: "converted" })], "quality")?.mimeType === "image/webp");
  check("budget: fitting beats non-fitting", pickAuto([c("image/jpeg", 90, { fits: true, quality: 40 }), c("image/avif", 80, { fits: false })], "budget")?.mimeType === "image/jpeg");
  check("budget: highest visual quality among fits (AVIF q60 ≈ JPEG 75 > JPEG 70)",
    pickAuto([c("image/jpeg", 99, { fits: true, quality: 70 }), c("image/avif", 97, { fits: true, quality: 60 })], "budget")?.mimeType === "image/avif");
  check("budget: none fit → smallest", pickAuto([c("image/jpeg", 300, { fits: false }), c("image/webp", 200, { fits: false })], "budget")?.mimeType === "image/webp");
  check("exact tie → most compatible", pickAuto([c("image/avif", 500), c("image/jpeg", 500)], "quality")?.mimeType === "image/jpeg");

  // ── Never make it bigger ─────────────────────────────────────────
  console.log("never bigger");
  const k = { neverBigger: true, auto: false, resized: false, sameFormat: true, inputMime: "image/png", animated: false, outputSize: 1200, originalSize: 1000 };
  check("same format, bigger → keep", shouldKeepOriginal(k));
  check("switch off → deliver the re-encode", !shouldKeepOriginal({ ...k, neverBigger: false }));
  check("resized → never kept", !shouldKeepOriginal({ ...k, resized: true }));
  check("explicit swap, bigger → deliver (user asked for that format)", !shouldKeepOriginal({ ...k, sameFormat: false }));
  check("Auto, every format bigger → keep original", shouldKeepOriginal({ ...k, sameFormat: false, auto: true }));
  check("HEIC never kept", !shouldKeepOriginal({ ...k, inputMime: "image/heic", auto: true, sameFormat: false }));
  check("animated never kept under Auto", !shouldKeepOriginal({ ...k, auto: true, sameFormat: false, animated: true }));
  check("smaller → not kept", !shouldKeepOriginal({ ...k, outputSize: 900 }));

  const part = (mimeType: CandidateSummary["mimeType"], size: number, extra: Partial<CompressionResult> = {}): CompressionResult => ({
    buffer: new ArrayBuffer(size), mimeType, originalSize: 1000, newSize: size, savedPct: 0, encodingTimeMs: 1, codec: `${mimeType} q70`,
    dimensions: { width: 10, height: 10 }, sourceDimensions: { width: 10, height: 10 }, iccStatus: "none", qualityModeUsed: "high",
    pngPhotoAdvisory: false, keptOriginal: false, animatedSource: null, metadataStripped: true, autoPicked: false,
    candidates: [{ mimeType, size, quality: 70, fits: null, iccStatus: "none" }], budget: null, hasAlpha: false,
    source: { hasProfile: false, cmyk: false }, ...extra,
  });
  const auto = { ...base, outputFormat: "auto" as const };
  {
    const m = mergeCandidates([part("image/jpeg", 800), part("image/webp", 600), part("image/avif", 500)], { buffer: new ArrayBuffer(1000), mime: "image/jpeg" }, auto, { encodingTimeMs: 5 });
    check("merge: Auto picks AVIF, −50%, all candidates listed", m.mimeType === "image/avif" && m.savedPct === 50 && m.autoPicked && m.candidates.length === 3);
  }
  {
    const m = mergeCandidates([part("image/webp", 1600), part("image/avif", 1400)], { buffer: new ArrayBuffer(1000), mime: "image/png" }, auto, { encodingTimeMs: 5 });
    check("merge: Auto keeps a smaller original", m.keptOriginal && m.mimeType === "image/png" && m.newSize === 1000 && !m.metadataStripped);
    const off = mergeCandidates([part("image/webp", 1600)], { buffer: new ArrayBuffer(1000), mime: "image/png" }, { ...auto, neverBigger: false }, { encodingTimeMs: 5 });
    check("merge: switch off → honest +60%", !off.keptOriginal && off.savedPct === -60);
  }

  // ── <img> snippet ────────────────────────────────────────────────
  console.log("snippet");
  const snip = imgSnippet({ fileName: "street-dusk-1920w.avif", width: 1920, height: 1280 });
  check("exact snippet", snip === '<img\n  src="/images/street-dusk-1920w.avif"\n  width="1920" height="1280"\n  alt="Describe the image"\n  loading="lazy"\n  decoding="async"\n>', snip);
  check("attribute escaping", imgSnippet({ fileName: 'a"b<c.png', width: 1, height: 1 }).includes('src="/images/a&quot;b&lt;c.png"'));

  // ── Starting points ──────────────────────────────────────────────
  console.log("starting points");
  const apply = (id: string) => mergeSettings(base, STARTING_POINTS.find((p) => p.id === id)?.patch ?? {});
  const hero = apply("hero");
  check("hero: auto · q75 · 1920", hero.outputFormat === "auto" && hero.goal === "quality" && sliderValue(hero) === 75 && maxWidthOf(hero) === 1920);
  const cards = apply("cards");
  check("cards: budget · 100 KB · 1280, keeps the chosen format", cards.goal === "budget" && cards.budgetKb === 100 && maxWidthOf(cards) === 1280 && cards.outputFormat === base.outputFormat);
  const ui = apply("ui");
  check("ui: webp · q85, original width", ui.outputFormat === "image/webp" && ui.goal === "quality" && sliderValue(ui) === 85 && maxWidthOf(ui) === 0);
  const up = apply("upload");
  check("upload: budget · 300 KB, keeps the chosen format", up.goal === "budget" && up.budgetKb === 300 && maxWidthOf(up) === 0 && up.outputFormat === base.outputFormat);
  check("chips match the design", STARTING_POINTS.map((p) => p.chip).join(" | ") === "auto · q75 · 1920 | budget · 100 KB · 1280 | webp · q85 | budget · 300 KB");
  check("changed-settings count", changedSettingsCount(base, cards) === 3 && changedSettingsCount(base, base) === 0);

  // ── Default + estimate sample ────────────────────────────────────
  console.log("default + estimates");
  check("default output keeps each upload's format (no Auto)", base.outputFormat === "original");
  {
    const g = globalThis as { ImageData?: unknown };
    g.ImageData ??= class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} };
    const w = 2000, h = 1000;
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] = x & 255; d[i + 1] = y & 255; d[i + 2] = (x >> 8) * 16; d[i + 3] = 255; }
    const img = { data: d, width: w, height: h } as unknown as ImageData;
    const sm = await makeEstimateSample(img, "image/jpeg", false);
    const px = new Uint8ClampedArray(sm.buffer);
    check(`mosaic sample ${sm.width}×${sm.height} ≤ 0.25 MP-ish, ratio ${sm.ratio.toFixed(2)}`, sm.width * sm.height <= ESTIMATE_MAX_PIXELS * 1.01 && Math.abs(sm.ratio - (w * h) / (sm.width * sm.height)) < 1e-9);
    // Tile (0,0) starts at an evenly spaced origin and copies full-res pixels.
    const sx = Math.round(((w - 128) * 0.5) / 4), sy = Math.round(((h - 128) * 0.5) / 4);
    check("mosaic tiles are full-resolution crops", px[0] === (sx & 255) && px[1] === (sy & 255) && px[(5 * sm.width + 7) * 4] === ((sx + 7) & 255));
    const small = await makeEstimateSample({ data: new Uint8ClampedArray(100 * 80 * 4), width: 100, height: 80 } as unknown as ImageData, "image/png", true);
    check("small image: whole frame, ratio 1, P3 flag kept", small.ratio === 1 && small.width === 100 && small.p3);
  }

  // ── Per-image format overrides ───────────────────────────────────
  console.log("overrides");
  check("no override → the global settings object itself", effectiveSettings(base, null) === base);
  check("override swaps only the format", effectiveSettings(base, "image/avif").outputFormat === "image/avif" && effectiveSettings(base, "image/avif").budgetKb === base.budgetKb);
  check("picking the global format = no override", overrideFor(base.outputFormat, base) === null && overrideFor("image/avif", base) === "image/avif");
  {
    const off = barPick("image/avif", false, base);
    const on = barPick("image/webp", true, base);
    check("bar, Apply to all off → this image only", off.kind === "image" && off.override === "image/avif");
    check("bar, Apply to all on → global format", on.kind === "global" && on.patch.outputFormat === "image/webp");
  }
  {
    const st = useCompressorStore.getState();
    st.reset();
    const mk = (id: string): ImageFile => ({
      id, file: { name: `${id}.jpg`, size: 1 } as File, originalSize: 1, inputMimeType: "image/jpeg", inputDimensions: null, previewUrl: "",
      settings: useCompressorStore.getState().globalSettings, formatOverride: null, status: "done",
      result: part("image/jpeg", 1), error: null, settingsDirty: false, settingsTouched: false, displayName: null, hasIcc: false,
      meta: null, sample: false, probes: null,
    });
    st.appendFiles(["a", "b", "c"].map(mk));
    st.setFormatOverride("b", "image/avif");
    let fs = useCompressorStore.getState().files;
    check("override re-runs only that image", fs[1].settings.outputFormat === "image/avif" && fs[1].settingsDirty && !fs[0].settingsDirty && !fs[2].settingsDirty && fs[0].settings.outputFormat === "original");
    check("collectOverrides", [...collectOverrides(fs)].join() === "b,image/avif");
    st.editSettings({ budgetKb: 222 });
    fs = useCompressorStore.getState().files;
    check("other global edits keep the override", fs[1].formatOverride === "image/avif" && fs[1].settings.budgetKb === 222 && fs[1].settings.outputFormat === "image/avif");
    st.editSettings({ outputFormat: "image/webp" });
    fs = useCompressorStore.getState().files;
    check("global Format clears overrides; all follow it", fs.every((f) => f.formatOverride === null && f.settings.outputFormat === "image/webp"));
    st.restoreFormatOverrides(new Map([["b", "image/avif"]]));
    check("Undo restores the override", useCompressorStore.getState().files[1].settings.outputFormat === "image/avif");
    st.setAutoUpdate(false);
    st.editSettings({ outputFormat: "image/jpeg" });
    check("manual mode: override waits for Compress", useCompressorStore.getState().files[1].formatOverride === "image/avif");
    st.applyDraft();
    check("…and Compress clears it", useCompressorStore.getState().files.every((f) => f.formatOverride === null && f.settings.outputFormat === "image/jpeg"));
    check("Apply to all defaults off; session toggle", !useCompressorStore.getState().convertAll && (st.setConvertAll(true), useCompressorStore.getState().convertAll));
    st.reset();
    check("reset → switch off again", !useCompressorStore.getState().convertAll);
  }

  // ── EXIF summary ─────────────────────────────────────────────────
  console.log("exif");
  check("Pixel 8 + GPS", JSON.stringify(readExifSummary(makeExifJpeg("Google", "Pixel 8", true), "image/jpeg")) === JSON.stringify({ exif: true, gps: true, camera: "Google Pixel 8" }));
  check("model already has make", readExifSummary(makeExifJpeg("Canon", "Canon EOS R5", false), "image/jpeg").camera === "Canon EOS R5");
  check("no EXIF", !readExifSummary(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer, "image/jpeg").exif);
  check("garbage never throws", !readExifSummary(new Uint8Array(64).fill(0xff).buffer, "image/jpeg").gps);

  // ── Naming ───────────────────────────────────────────────────────
  console.log("naming");
  const file = { displayName: null, file: { name: "street dusk.jpg" } as File };
  check("resized names carry the width", outputFileName(file, part("image/avif", 10, { dimensions: { width: 1920, height: 1280 }, sourceDimensions: { width: 4000, height: 2667 } })) === "street dusk-1920w.avif");
  check("unresized name", outputFileName(file, part("image/webp", 10)) === "street dusk.webp");
  check("ZIP de-dup", uniqueNames(["image.png", "Image.png", "image.png", "a.webp"]).join(",") === "image.png,Image (2).png,image (3).png,a.webp");

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

/** Minimal JPEG: SOI, APP1 Exif (big-endian) with Make, Model, GPS IFD pointer. */
function makeExifJpeg(make: string, model: string, gps: boolean): ArrayBuffer {
  const enc = (s: string) => [...s].map((ch) => ch.charCodeAt(0)).concat([0]);
  const entries: [number, number, number, number[]][] = [
    [0x010f, 2, make.length + 1, enc(make)],
    [0x0110, 2, model.length + 1, enc(model)],
  ];
  if (gps) entries.push([0x8825, 4, 1, []]);
  const ifdSize = 2 + entries.length * 12 + 4;
  let dataOff = 8 + ifdSize;
  const tiff: number[] = [0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8];
  const data: number[] = [];
  const u16 = (n: number) => [(n >> 8) & 255, n & 255];
  const u32 = (n: number) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  tiff.push(...u16(entries.length));
  for (const [tag, type, count, bytes] of entries) {
    tiff.push(...u16(tag), ...u16(type), ...u32(count));
    if (tag === 0x8825) tiff.push(...u32(200));
    else if (bytes.length <= 4) tiff.push(...bytes, ...new Array(4 - bytes.length).fill(0));
    else {
      tiff.push(...u32(dataOff));
      data.push(...bytes);
      dataOff += bytes.length;
    }
  }
  tiff.push(0, 0, 0, 0, ...data);
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = payload.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (len >> 8) & 255, len & 255, ...payload, 0xff, 0xd9]).buffer;
}

void main();
