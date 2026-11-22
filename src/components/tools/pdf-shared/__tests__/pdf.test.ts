/**
 * PDF tools: page-list edits, PDF facts, real merges and signing with
 * pdf-lib, and the screen → PDF coordinate mapping against PDF.js's own
 * viewport maths (including rotated pages).
 *
 * Run: npx tsx src/components/tools/pdf-shared/__tests__/pdf.test.ts
 */

/* eslint-disable no-console */
import { degrees, PDFDocument, PDFHexString, PDFName, PDFRawStream, PDFString, StandardFonts, type PDFNumber } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { estimateBytes, moveFile, moveFileUp, movePage, pagesOf, removePages, rotatePages, shiftSelected, type PdfFile } from "../../merge-pdf/merge-pdf.lib";
import { fieldToPdfBox, formatDate, initialsOf, parseDateInput, todayInput, inkBounds, isWinAnsi, moveField, newField, removePaper, resizeField } from "../../sign-pdf/sign-pdf.lib";
import { formatBytes, looksLikePdf, pdfFileName } from "../pdf-inspect.lib";
import { pdfFacts } from "../pdfjs";
import { compressPdf, deflate, looksLikePhoto, mergePdfs, PdfOpError, signPdf, splitPdf, type ImageCodec } from "../pdf-ops.lib";
import { chunks, describePages, groupOfPage, groupsFor, outputName, parseRanges } from "../../split-pdf/split-pdf.lib";
import { verdict } from "../../compress-pdf/compress-pdf.lib";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`, detail ?? "");
  }
}
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

async function makePdf(sizes: [number, number][], opts: { rotate?: number } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  sizes.forEach(([w, h], i) => {
    const p = doc.addPage([w, h]);
    p.drawText(`Page ${i + 1}`, { x: 40, y: h - 60, size: 18, font });
    if (opts.rotate) p.setRotation(degrees(opts.rotate));
  });
  return doc.save();
}
const ab = (u: Uint8Array) => u.slice().buffer;

async function main() {
  console.log("page list");
  const A: PdfFile = { id: "a", name: "a.pdf", size: 3000, pageCount: 3, hue: 0 };
  const B: PdfFile = { id: "b", name: "b.pdf", size: 1000, pageCount: 1, hue: 1 };
  let pages = [...pagesOf(A), ...pagesOf(B)];
  check("pages in file order", pages.map((p) => p.id).join(",") === "a:0,a:1,a:2,b:0");
  check("move page", movePage(pages, 3, 0).map((p) => p.id).join(",") === "b:0,a:0,a:1,a:2");
  check("shift selection earlier as a block", shiftSelected(pages, new Set(["a:2", "b:0"]), -1).map((p) => p.id).join(",") === "a:0,a:2,b:0,a:1");
  check("shift at the edge stays", shiftSelected(pages, new Set(["a:0"]), -1)[0].id === "a:0");
  check("rotate wraps", rotatePages(rotatePages(pages, new Set(["a:0"]), 270), new Set(["a:0"]), 180)[0].rotate === 90);
  check("remove", removePages(pages, new Set(["a:1"])).length === 3);
  pages = movePage(pages, 0, 2); // a:1,a:2,a:0,b:0
  const up = moveFileUp([A, B], pages, "b");
  check("file up keeps in-file order", up.files[0].id === "b" && up.pages.map((p) => p.id).join(",") === "b:0,a:1,a:2,a:0");
  const C: PdfFile = { id: "c", name: "c.pdf", size: 10, pageCount: 1, hue: 2 };
  const moved = moveFile([A, B, C], [...pagesOf(A), ...pagesOf(B), ...pagesOf(C)], 2, 0);
  check("drag a file to the front", moved.files.map((f) => f.id).join("") === "cab" && moved.pages[0].id === "c:0" && moved.pages[1].id === "a:0");
  check("size estimate shares bytes", estimateBytes([A, B], removePages(pagesOf(A), new Set(["a:0"]))) === 2000);

  console.log("facts");
  const plain = await makePdf([[595, 842]]);
  check("PDF header", looksLikePdf(plain) && !looksLikePdf(new TextEncoder().encode("hello")));
  // Facts come from PDF.js's own parse.
  const plainFacts = await pdfFacts(await getDocument({ data: plain.slice() }).promise);
  check("plain PDF: not encrypted, not signed", !plainFacts.encrypted && !plainFacts.digitallySigned, plainFacts);
  const sdocSig = await PDFDocument.create();
  const sp = sdocSig.addPage([595, 842]);
  const sctx = sdocSig.context;
  const sigValue = sctx.register(sctx.obj({ Type: "Sig", Filter: "Adobe.PPKLite", SubFilter: "adbe.pkcs7.detached", ByteRange: [0, 10, 20, 30], Contents: PDFHexString.of("00") }));
  const sigField = sctx.register(sctx.obj({ Type: "Annot", Subtype: "Widget", FT: "Sig", T: PDFString.of("Signature1"), V: sigValue, Rect: [0, 0, 0, 0], F: 132, P: sp.ref }));
  sp.node.set(PDFName.of("Annots"), sctx.obj([sigField]));
  sdocSig.catalog.set(PDFName.of("AcroForm"), sctx.obj({ Fields: [sigField], SigFlags: 3 }));
  const signedFacts = await pdfFacts(await getDocument({ data: (await sdocSig.save()).slice() }).promise);
  check("certificate-signed PDF spotted", signedFacts.digitallySigned && !signedFacts.encrypted, signedFacts);
  check("file name", pdfFileName(' Q3 / report.PDF ', "merged") === "Q3 - report.pdf" && pdfFileName("", "merged") === "merged.pdf");
  check("bytes", formatBytes(2048) === "2 KB" && formatBytes(5 * 1048576) === "5.0 MB");

  console.log("merge");
  const a = await makePdf([[595, 842], [595, 842], [595, 842]]);
  const b = await makePdf([[612, 792]], { rotate: 90 });
  const merged = await mergePdfs({
    kind: "merge",
    files: [
      { id: "a", bytes: ab(a) },
      { id: "b", bytes: ab(b) },
    ],
    pages: [
      { file: "b", index: 0, rotate: 90 },
      { file: "a", index: 2, rotate: 0 },
      { file: "a", index: 0, rotate: 270 },
    ],
  });
  const out = await PDFDocument.load(merged);
  const outPages = out.getPages();
  check("3 pages out", outPages.length === 3);
  check("order kept (sizes)", outPages[0].getWidth() === 612 && outPages[1].getWidth() === 595);
  check("rotation adds to the page's own", outPages[0].getRotation().angle === 180);
  check("rotation applied", outPages[2].getRotation().angle === 270);
  check("dropped page not copied", (await mergePdfs({ kind: "merge", files: [{ id: "a", bytes: ab(a) }], pages: [{ file: "a", index: 1, rotate: 0 }] })).byteLength < a.byteLength);
  try {
    await mergePdfs({ kind: "merge", files: [{ id: "x", bytes: ab(new TextEncoder().encode("nope")) }], pages: [{ file: "x", index: 0, rotate: 0 }] });
    check("bad file rejected", false);
  } catch (e) {
    check("bad file rejected with a message", e instanceof PdfOpError);
  }
  const big = await makePdf(Array.from({ length: 300 }, (): [number, number] => [595, 842]));
  const t0 = performance.now();
  const bigOut = await mergePdfs({ kind: "merge", files: [{ id: "a", bytes: ab(big) }, { id: "b", bytes: ab(big) }], pages: [...Array.from({ length: 300 }, (_, i) => ({ file: "a", index: i, rotate: 0 })), ...Array.from({ length: 300 }, (_, i) => ({ file: "b", index: i, rotate: 0 }))] });
  const ms = performance.now() - t0;
  console.log(`    600-page merge: ${ms.toFixed(0)} ms, ${(bigOut.byteLength / 1024).toFixed(0)} KB`);
  check("600-page merge under 3 s", ms < 3000);

  console.log("signing geometry");
  // A field covering the bottom-left quarter-strip of an upright A4 page.
  const f = { id: "f", kind: "sig" as const, page: 0, x: 0.1, y: 0.8, w: 0.3, h: 0.1, text: "" };
  for (const rotation of [0, 90, 180, 270]) {
    // A real page with /Rotate, opened by PDF.js itself.
    const pdf = await getDocument({ data: await makePdf([[595, 842]], { rotate: rotation }) }).promise;
    const vp = (await pdf.getPage(1)).getViewport({ scale: 1 });
    const box = fieldToPdfBox(f, vp.width, vp.height, (x, y) => {
      const p = vp.convertToPdfPoint(x, y);
      return [Number(p[0]), Number(p[1])];
    });
    // Map the box's far corner back to the screen: it must land on the field's top-right.
    const r = (box.rotate * Math.PI) / 180;
    const tr = [box.x + box.w * Math.cos(r) - box.h * Math.sin(r), box.y + box.w * Math.sin(r) + box.h * Math.cos(r)];
    const back = vp.convertToViewportPoint(tr[0], tr[1]);
    const want = [(f.x + f.w) * vp.width, f.y * vp.height];
    check(`/Rotate ${rotation}: box lands on the field`, near(Number(back[0]), want[0], 0.5) && near(Number(back[1]), want[1], 0.5), { back, want, box });
    check(`/Rotate ${rotation}: content turned ${rotation}°`, near(((box.rotate % 360) + 360) % 360, rotation, 0.01), box.rotate);
  }

  console.log("signing");
  const rotated = await makePdf([[595, 842]], { rotate: 90 });
  const png = await PDFDocument.create().then(async () => {
    // 1×1 transparent PNG
    return Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  });
  const signed = await signPdf({
    kind: "sign",
    bytes: ab(rotated),
    items: [
      { kind: "image", page: 0, x: 100, y: 100, w: 120, h: 40, rotate: 90, png: ab(png) },
      { kind: "text", page: 0, x: 100, y: 300, w: 120, h: 14, rotate: 90, text: "22 Nov 2026", color: [0, 0, 0] },
      { kind: "check", page: 0, x: 300, y: 300, w: 20, h: 20, rotate: 0, color: [0.1, 0.2, 0.3] },
    ],
  });
  const sdoc = await PDFDocument.load(signed);
  const res = sdoc.getPage(0).node.Resources();
  const xobjects = res?.lookup(PDFName.of("XObject"));
  check("signed: page rotation kept", sdoc.getPage(0).getRotation().angle === 90);
  check("signed: image embedded", String(xobjects ?? "").includes("/Image"), String(xobjects));
  check("signed: font embedded for the date", String(res?.lookup(PDFName.of("Font"))).includes("/"));
  check("signed: still one page", sdoc.getPageCount() === 1);

  console.log("split");
  const r1 = parseRanges("1-3, 5, 8-", 10);
  check("ranges", JSON.stringify(r1.groups) === "[[0,1,2],[4],[7,8,9]]" && !r1.error, r1);
  check("descending range + last", JSON.stringify(parseRanges("5–3, last", 6).groups) === "[[4,3,2],[5]]");
  check("range errors explain", parseRanges("1-30", 10).error.includes("10 pages") && parseRanges("a-b", 3).error.includes("isn't"));
  check("empty is not an error", parseRanges("  ", 3).groups.length === 0 && parseRanges("  ", 3).error === "");
  check("chunks", JSON.stringify(chunks(5, 2)) === "[[0,1],[2,3],[4]]");
  check("pick mode keeps page order", JSON.stringify(groupsFor({ mode: "pick", pageCount: 5, picked: new Set([3, 0]), ranges: "", every: 2 }).groups) === "[[0,3]]");
  check("every page", groupsFor({ mode: "every", pageCount: 3, picked: new Set(), ranges: "", every: 2 }).groups.length === 3);
  check("page → output file", JSON.stringify(groupOfPage([[0, 1], [3]], 4)) === "[0,0,-1,1]");
  check("describe pages", describePages([0, 1, 2, 4, 6, 7]) === "1–3, 5, 7–8");
  check("output names", outputName("Report Q3.pdf", [0, 1, 2]) === "Report Q3-p1-3.pdf" && outputName("a", [0, 2]) === "a-p1_3.pdf");
  const ten = await makePdf(Array.from({ length: 10 }, (_, i): [number, number] => [400 + i, 600]));
  const parts = await splitPdf({ kind: "split", bytes: ab(ten), groups: [[0, 1, 2], [9], [4, 3]] });
  const loaded = await Promise.all(parts.map((part) => PDFDocument.load(part)));
  check("split: 3 files with the right page counts", loaded.map((d) => d.getPageCount()).join(",") === "3,1,2");
  check("split: order kept (5-4 reversed)", loaded[2].getPage(0).getWidth() === 404 && loaded[1].getPage(0).getWidth() === 409);

  console.log("compress");
  // A PDF with: a JPEG photo, a CMYK JPEG, a lossless noisy "photo",
  // a lossless flat diagram, and an uncompressed text stream.
  const cdoc = await PDFDocument.create();
  cdoc.addPage([595, 842]);
  const ctx = cdoc.context;
  const img = (extra: Record<string, unknown>, bytes: Uint8Array) =>
    ctx.register(PDFRawStream.of(ctx.obj({ Type: "XObject", Subtype: "Image", Width: 400, Height: 300, BitsPerComponent: 8, ...extra }), bytes));
  const fakeJpeg = new Uint8Array(60_000).fill(7);
  const jpegRef = img({ ColorSpace: "DeviceRGB", Filter: "DCTDecode" }, fakeJpeg);
  const cmykRef = img({ ColorSpace: "DeviceCMYK", Filter: "DCTDecode" }, fakeJpeg);
  const noise = new Uint8Array(400 * 300 * 3);
  // xorshift32: thousands of distinct colours, like a photo.
  let seed = 2463534242;
  for (let i = 0; i < noise.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    noise[i] = seed & 255;
  }
  const noiseRef = img({ ColorSpace: "DeviceRGB", Filter: "FlateDecode" }, await deflate(noise));
  const flat = new Uint8Array(400 * 300 * 3).fill(200);
  const flatRef = img({ ColorSpace: "DeviceRGB", Filter: "FlateDecode" }, await deflate(flat));
  const greyRef = img({ ColorSpace: "DeviceGray", Filter: "DCTDecode" }, fakeJpeg);
  const textRef = ctx.register(PDFRawStream.of(ctx.obj({}), new TextEncoder().encode("BT /F1 12 Tf 72 712 Td (Hello) Tj ET\n".repeat(400))));
  const calls: string[] = [];
  const fake: ImageCodec = {
    async fromJpeg(_j, q, maxPx) {
      calls.push(`jpeg q${q} max${maxPx}`);
      return { bytes: new Uint8Array(5000), w: 200, h: 150 };
    },
    async fromPixels(_px, w, h, ch) {
      calls.push(`pixels ${w}x${h}x${ch}`);
      return { bytes: new Uint8Array(4000), w, h };
    },
  };
  const before = await cdoc.save();
  const { bytes: smaller, stats } = await compressPdf({ kind: "compress", bytes: ab(before), quality: 0.7, maxPx: 2000, photosFromLossless: true }, fake);
  const out2 = await PDFDocument.load(smaller);
  const look = (ref: typeof jpegRef) => out2.context.lookup(ref);
  const jp = look(jpegRef);
  check("JPEG photo re-encoded", jp instanceof PDFRawStream && jp.contents.length === 5000 && (jp.dict.get(PDFName.of("Width")) as PDFNumber).asNumber() === 200, stats);
  const cm = look(cmykRef);
  check("CMYK image left untouched (colour)", cm instanceof PDFRawStream && cm.contents.length === 60_000 && stats.keptForColour === 1);
  const nz = look(noiseRef);
  check("lossless photo → JPEG", nz instanceof PDFRawStream && nz.dict.get(PDFName.of("Filter")) === PDFName.of("DCTDecode"));
  const fl = look(flatRef);
  check("lossless diagram left lossless", fl instanceof PDFRawStream && fl.dict.get(PDFName.of("Filter")) === PDFName.of("FlateDecode"));
  const gr = look(greyRef);
  check("grey JPEG becomes RGB JPEG (canvas output)", gr instanceof PDFRawStream && gr.dict.get(PDFName.of("ColorSpace")) === PDFName.of("DeviceRGB"));
  const tx = look(textRef);
  check("uncompressed text stream deflated", tx instanceof PDFRawStream && tx.dict.get(PDFName.of("Filter")) === PDFName.of("FlateDecode") && stats.streamsDeflated === 1);
  check("stats add up", stats.images === 5 && stats.recompressed === 3 && stats.keptForColour === 1 && stats.keptAsIs === 1, stats);
  check("smaller overall", smaller.byteLength < before.byteLength * 0.5, `${before.byteLength} → ${smaller.byteLength}`);
  check("codec got the level", calls.includes("jpeg q0.7 max2000"));
  const light = await compressPdf({ kind: "compress", bytes: ab(before), quality: 0.9, maxPx: 3000, photosFromLossless: false }, fake);
  check("light level keeps lossless photos lossless", light.stats.recompressed === 2);
  const noGain: ImageCodec = { fromJpeg: async () => ({ bytes: new Uint8Array(59_000), w: 400, h: 300 }), fromPixels: async () => null };
  check("no-gain re-encodes are discarded", (await compressPdf({ kind: "compress", bytes: ab(before), quality: 0.9, maxPx: 3000, photosFromLossless: true }, noGain)).stats.recompressed === 0);
  check("photo detector", looksLikePhoto(noise, 3) && !looksLikePhoto(flat, 3));
  check("verdict: smaller", verdict(1000, 380).smaller && verdict(1000, 380).pct === -62);
  check("verdict: not smaller is honest", !verdict(1000, 1030).smaller && verdict(1000, 1030).pct === 3 && !verdict(1000, 995).smaller);

  console.log("signature helpers");
  check("date long", formatDate(new Date(2026, 10, 22), "long") === "22 Nov 2026");
  check("date us / iso", formatDate(new Date(2026, 0, 5), "us") === "1/5/2026" && formatDate(new Date(2026, 0, 5), "iso") === "2026-01-05");
  check("date input parses", parseDateInput("2026-12-01")?.getDate() === 1 && parseDateInput("2026-02-30") === null && parseDateInput("1/2/2026") === null);
  check("today as input value", /^\d{4}-\d{2}-\d{2}$/.test(todayInput()) && todayInput(new Date(2026, 0, 5)) === "2026-01-05");
  check("initials", initialsOf("ada king lovelace") === "AKL" && initialsOf("  ") === "");
  check("WinAnsi", isWinAnsi("Zoë – “quoted” €5") && !isWinAnsi("Жанна") && !isWinAnsi("山田"));
  const nf = newField("sig", 0, 0.98, 0.5, 842 / 595, 0.33, "x");
  check("new field stays on the page", nf.x + nf.w <= 1 && nf.x >= 0);
  check("move clamps", moveField(nf, 5, 5).x + nf.w <= 1.0000001 && moveField(nf, 5, 5).y + nf.h <= 1.0000001);
  const rs = resizeField({ ...nf, x: 0.1 }, 0.5);
  check("resize keeps aspect", near(rs.h / rs.w, nf.h / nf.w, 1e-9));
  const px = new Uint8ClampedArray([250, 250, 250, 255, 20, 20, 60, 255, 175, 175, 175, 255]);
  removePaper(px);
  check("paper removed, ink kept, grey fades", px[3] === 0 && px[7] === 255 && px[11] > 0 && px[11] < 255);
  const ink = new Uint8ClampedArray(4 * 4 * 4);
  ink[(1 * 4 + 2) * 4 + 3] = 255;
  ink[(2 * 4 + 1) * 4 + 3] = 255;
  const bb = inkBounds(ink, 4, 4);
  check("ink bounds", bb !== null && bb.x === 1 && bb.y === 1 && bb.w === 2 && bb.h === 2, bb);
  check("no ink", inkBounds(new Uint8ClampedArray(16), 2, 2) === null);


  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

void main();
