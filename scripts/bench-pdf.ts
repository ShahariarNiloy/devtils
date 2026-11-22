/**
 * PDF tools benchmark: the pdf-lib work behind Merge, Split, Sign and
 * Compress on big files (a 3,000-page text PDF and a ~280 MB PDF of 50
 * distinct 4K photos). Image encoding is stubbed — that part runs on the
 * browser's own threads and is measured in the browser.
 *
 *   pnpm bench:pdf                 # builds the test files once in $TMPDIR
 *   pnpm bench:pdf <photo.jpg>     # use your own JPEG for the photo PDF
 *
 * Run before and after changing anything in src/components/tools/pdf-shared.
 */
/* eslint-disable no-console */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { compressPdf, mergePdfs, signPdf, splitPdf, type ImageCodec } from "../src/components/tools/pdf-shared/pdf-ops.lib";

const DIR = join(tmpdir(), "utilyx-pdf-bench");
const TEXT = join(DIR, "text-3000.pdf");
const PHOTOS = join(DIR, "photos-50.pdf");

async function build(photo: string | undefined) {
  mkdirSync(DIR, { recursive: true });
  if (!existsSync(TEXT)) {
    const d = await PDFDocument.create();
    const f = await d.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 3000; i++) {
      const p = d.addPage([595, 842]);
      for (let l = 0; l < 40; l++) p.drawText(`Page ${i + 1} line ${l} — the quick brown fox jumps over the lazy dog.`, { x: 50, y: 800 - l * 18, size: 10, font: f });
    }
    writeFileSync(TEXT, await d.save());
  }
  if (!existsSync(PHOTOS)) {
    const d = await PDFDocument.create();
    const jpg = photo ? readFileSync(photo) : null;
    for (let i = 0; i < 50; i++) {
      const p = d.addPage([595, 842]);
      if (jpg) {
        // A unique comment segment makes each copy a separate image object.
        const tag = Buffer.from(`utilyx-bench-${i}`);
        const com = Buffer.concat([Buffer.from([0xff, 0xfe, 0, tag.length + 2]), tag]);
        const img = await d.embedJpg(Buffer.concat([jpg.subarray(0, 2), com, jpg.subarray(2)]));
        p.drawImage(img, { x: 20, y: 300, width: 555, height: (555 * img.height) / img.width });
      } else {
        p.drawRectangle({ x: 20, y: 300, width: 555, height: 400, color: rgb(i / 50, 0.4, 0.6) });
      }
    }
    writeFileSync(PHOTOS, await d.save());
  }
}

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const stub: ImageCodec = { fromJpeg: async () => ({ bytes: new Uint8Array(200_000), w: 2000, h: 1125 }), fromPixels: async () => null };

async function time(label: string, fn: () => Promise<unknown>) {
  const t = performance.now();
  await fn();
  console.log(`${label.padEnd(46)} ${(performance.now() - t).toFixed(0).padStart(6)} ms   ${Math.round(process.memoryUsage().rss / 1048576)} MB rss`);
}

async function main() {
  await build(process.argv[2]);
  const text = readFileSync(TEXT);
  const photos = readFileSync(PHOTOS);
  const pages = (await PDFDocument.load(photos)).getPageCount();
  console.log(`files: ${TEXT} (${(text.length / 1048576).toFixed(1)} MB), ${PHOTOS} (${(photos.length / 1048576).toFixed(0)} MB, ${pages} pages)\n`);
  await time("merge: 3000 text pages + 50 photo pages", () =>
    mergePdfs({
      kind: "merge",
      files: [
        { id: "t", bytes: ab(text) },
        { id: "p", bytes: ab(photos) },
      ],
      pages: [...Array.from({ length: 3000 }, (_, i) => ({ file: "t", index: i, rotate: 0 })), ...Array.from({ length: 50 }, (_, i) => ({ file: "p", index: i, rotate: 0 }))],
    }),
  );
  await time("split: 3000 pages → 3000 files", () => splitPdf({ kind: "split", bytes: ab(text), groups: Array.from({ length: 3000 }, (_, i) => [i]) }));
  await time("sign: one tick on the photo PDF", () =>
    signPdf({ kind: "sign", bytes: ab(photos), items: [{ kind: "check", page: 0, x: 50, y: 50, w: 20, h: 20, rotate: 0, color: [0, 0, 0] }] }),
  );
  await time("compress the photo PDF (encoder stubbed)", () => compressPdf({ kind: "compress", bytes: ab(photos), quality: 0.74, maxPx: 2000, photosFromLossless: true }, stub));
  await time("compress 3000 text pages", () => compressPdf({ kind: "compress", bytes: ab(text), quality: 0.74, maxPx: 2000, photosFromLossless: true }, stub));
}
void main();
