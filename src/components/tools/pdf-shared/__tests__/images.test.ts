/**
 * Image to PDF and PDF to image: format sniffing, JPEG frames and EXIF
 * orientation, page layout, the PDF writer (with a stand-in codec), and the
 * export helpers.
 *
 * Run: npx tsx src/components/tools/pdf-shared/__tests__/images.test.ts
 */

/* eslint-disable no-console */
import { PDFDocument, PDFName, type PDFRawStream } from "pdf-lib";
import { estimatePdfBytes, layoutPage, turned } from "../image-layout.lib";
import {
  compose,
  headerSize,
  jpegFrame,
  jpegOrientation,
  sniffImage,
  uprightMatrix,
  type Matrix,
  type Orientation,
} from "../image-probe.lib";
import {
  imageInfo,
  imagesToPdf,
  onWhite,
  splitAlpha,
  type RasterCodec,
} from "../images-to-pdf.lib";
import { PdfOpError } from "../pdf-ops.lib";
import {
  fileNameFor,
  pickQuick,
  renderSize,
} from "../../pdf-to-image/pdf-to-image.lib";

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

async function main() {
  console.log("image probing");
  /** A JPEG header: SOI, optional EXIF orientation, optional Adobe APP14, SOF0, SOS. */
  const fakeJpeg = (
    w: number,
    h: number,
    o: {
      orientation?: number;
      components?: number;
      adobe?: boolean;
      body?: number;
    } = {},
  ) => {
    const seg = (m: number, data: number[]) => [
      0xff,
      m,
      (data.length + 2) >> 8,
      (data.length + 2) & 255,
      ...data,
    ];
    const parts: number[] = [0xff, 0xd8];
    if (o.orientation) {
      // "Exif\0\0" + big-endian TIFF with one IFD entry: 0x0112 SHORT 1 = orientation
      const tiff = [
        0x4d,
        0x4d,
        0,
        42,
        0,
        0,
        0,
        8,
        0,
        1,
        0x01,
        0x12,
        0,
        3,
        0,
        0,
        0,
        1,
        0,
        o.orientation,
        0,
        0,
        0,
        0,
        0,
        0,
      ];
      parts.push(...seg(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]));
    }
    if (o.adobe)
      parts.push(
        ...seg(0xee, [0x41, 0x64, 0x6f, 0x62, 0x65, 0, 100, 0, 0, 0, 0, 0]),
      );
    const n = o.components ?? 3;
    parts.push(
      ...seg(0xc0, [
        8,
        h >> 8,
        h & 255,
        w >> 8,
        w & 255,
        n,
        ...Array.from({ length: n }, (_, i) => [i + 1, 0x11, 0]).flat(),
      ]),
    );
    parts.push(
      ...seg(0xda, [1, 1, 0, 0, 63, 0]),
      ...Array.from({ length: o.body ?? 64 }, (_, i) => (i * 37) & 0x7f),
      0xff,
      0xd9,
    );
    return new Uint8Array(parts);
  };
  const ascii = (t: string) => Array.from(t, (c) => c.charCodeAt(0));
  const png = new Uint8Array([
    0x89,
    ...ascii("PNG"),
    13,
    10,
    26,
    10,
    0,
    0,
    0,
    13,
    ...ascii("IHDR"),
    0,
    0,
    0x0f,
    0xa0,
    0,
    0,
    0x0b,
    0xb8,
    8,
    6,
    0,
    0,
    0,
  ]);
  const heic = new Uint8Array([
    0,
    0,
    0,
    24,
    ...ascii("ftypheic"),
    0,
    0,
    0,
    0,
    ...ascii("mif1heic"),
  ]);
  const avif = new Uint8Array([
    0,
    0,
    0,
    24,
    ...ascii("ftypmif1"),
    0,
    0,
    0,
    0,
    ...ascii("avifmiaf"),
  ]);
  check(
    "sniff",
    sniffImage(fakeJpeg(4, 4)) === "jpeg" &&
      sniffImage(png) === "png" &&
      sniffImage(heic) === "heic" &&
      sniffImage(avif) === "avif",
  );
  check(
    "sniff GIF / WebP / junk",
    sniffImage(new Uint8Array([...ascii("GIF89a"), 10, 0, 20, 0, 0, 0])) ===
      "gif" &&
      sniffImage(
        new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")]),
      ) === "webp" &&
      sniffImage(new TextEncoder().encode("hello, world!")) === null,
  );
  check(
    "PNG size from IHDR",
    JSON.stringify(headerSize(png, "png")) ===
      JSON.stringify({ w: 4000, h: 3000 }),
  );
  const rotated = fakeJpeg(4032, 3024, { orientation: 6 });
  check(
    "JPEG frame + EXIF orientation",
    jpegFrame(rotated)?.w === 4032 && jpegOrientation(rotated) === 6,
  );
  check(
    "upright size swaps for a quarter turn",
    JSON.stringify(headerSize(rotated, "jpeg")) ===
      JSON.stringify({ w: 3024, h: 4032 }),
  );
  const cmyk = jpegFrame(fakeJpeg(100, 50, { components: 4, adobe: true }));
  check(
    "CMYK + Adobe spotted",
    cmyk?.components === 4 && cmyk.adobe === true,
    cmyk,
  );

  const apply = (m: Matrix, u: number, v: number) =>
    [m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]].map(
      (x) => Math.round(x * 1e6) / 1e6,
    );
  // Where the stored picture's top-left corner (0, 1) must end up, per EXIF orientation.
  const topLeft: Record<Orientation, [number, number]> = {
    1: [0, 1],
    2: [1, 1],
    3: [1, 0],
    4: [0, 0],
    5: [0, 1],
    6: [1, 1],
    7: [1, 0],
    8: [0, 0],
  };
  const allOk = ([1, 2, 3, 4, 5, 6, 7, 8] as Orientation[]).every((o) => {
    const m = uprightMatrix(o, 0);
    const [x, y] = apply(m, 0, 1);
    const corners = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 1, 1)].every(
      ([a, b]) => (a === 0 || a === 1) && (b === 0 || b === 1),
    );
    return x === topLeft[o][0] && y === topLeft[o][1] && corners;
  });
  check("EXIF orientations map the unit square onto itself correctly", allOk);
  check(
    "user quarter turn clockwise",
    JSON.stringify(apply(uprightMatrix(1, 90), 0, 1)) === "[1,1]" &&
      JSON.stringify(apply(uprightMatrix(1, 270), 0, 1)) === "[0,0]",
  );
  check(
    "a quarter turn each way cancels out",
    JSON.stringify(
      apply(compose(uprightMatrix(8, 0), uprightMatrix(6, 0)), 0.25, 0.75),
    ) === "[0.25,0.75]",
  );

  console.log("image layout");
  const L1 = layoutPage(4032, 3024, {
    page: "a4",
    orient: "auto",
    margin: "small",
    fit: "contain",
  });
  check(
    "wide image → landscape A4",
    near(L1.pw, 841.89) && near(L1.ph, 595.28),
  );
  check(
    "contain stays inside the margin",
    L1.box.x >= L1.inner.x - 1e-9 &&
      L1.box.w <= L1.inner.w + 1e-9 &&
      near(L1.box.w / L1.box.h, 4032 / 3024) &&
      !L1.cropped,
  );
  const L2 = layoutPage(1200, 3000, {
    page: "letter",
    orient: "auto",
    margin: "none",
    fit: "cover",
  });
  check(
    "cover fills and reports cropping",
    near(L2.box.w, 612) && L2.box.h > 792 && L2.cropped,
  );
  const L3 = layoutPage(2000, 1000, {
    page: "fit",
    orient: "portrait",
    margin: "none",
    fit: "cover",
  });
  check(
    "same as image: 96 DPI page, never cropped",
    near(L3.pw, 1500) && near(L3.ph, 750) && !L3.cropped,
  );
  check(
    "forced portrait for a wide image",
    layoutPage(4000, 3000, {
      page: "a4",
      orient: "portrait",
      margin: "none",
      fit: "contain",
    }).pw < 600,
  );
  check(
    "turned",
    JSON.stringify(turned(4, 3, 90)) === '{"w":3,"h":4}' &&
      JSON.stringify(turned(4, 3, 180)) === '{"w":4,"h":3}',
  );
  const est = [
    { type: "jpeg", bytes: 3_000_000, w: 4032, h: 3024 },
    { type: "png", bytes: 400_000, w: 2880, h: 1800 },
  ];
  check(
    "estimate shrinks with the size choice",
    estimatePdfBytes(est, "original") > estimatePdfBytes(est, "balanced") &&
      estimatePdfBytes(est, "balanced") > estimatePdfBytes(est, "small"),
  );

  console.log("images → PDF");
  check(
    "alpha split",
    splitAlpha(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255])).alpha ===
      null &&
      splitAlpha(new Uint8ClampedArray([1, 2, 3, 128])).alpha?.[0] === 128,
  );
  check(
    "flatten onto white",
    onWhite(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255])).join() ===
      "255,255,255,255,0,0,0,255",
  );
  const calls: string[] = [];
  const noise = (w: number, h: number, alpha = 255) => {
    const d = new Uint8ClampedArray(w * h * 4);
    let x = 7;
    for (let i = 0; i < d.length; i += 4) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      d[i] = x & 255;
      d[i + 1] = (x >>> 8) & 255;
      d[i + 2] = (x >>> 16) & 255;
      d[i + 3] = alpha;
    }
    return d;
  };
  const flat = (w: number, h: number) =>
    new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 3 ? 255 : 200));
  const codec: RasterCodec = {
    async decode(bytes, type, maxPx) {
      calls.push(`decode:${type}`);
      const [w, h] = type === "png" ? [300, 200] : [400, 300];
      const s = Math.min(1, maxPx / Math.max(w, h));
      const W = Math.round(w * s);
      const H = Math.round(h * s);
      let rgba = noise(W, H);
      if (type === "png") rgba = flat(W, H);
      if (type === "webp") rgba = noise(W, H, 200);
      return { rgba, w: W, h: H };
    },
    async jpeg(px) {
      calls.push(`jpeg:${px.w}x${px.h}`);
      return fakeJpeg(px.w, px.h, { body: 10 });
    },
    async thumbnail(_b, _t, size) {
      return { jpeg: new Uint8Array([1]), w: size?.w ?? 9, h: size?.h ?? 9 };
    },
  };
  const jpg = fakeJpeg(400, 300, { orientation: 6, body: 4000 });
  const blob = (b: Uint8Array) => new Blob([b as Uint8Array<ArrayBuffer>]);
  const layout = {
    page: "a4",
    orient: "auto",
    margin: "none",
    fit: "contain",
  } as const;
  const job = (mode: "original" | "balanced" | "small") => ({
    kind: "images" as const,
    mode,
    layout,
    images: [
      { blob: blob(jpg), name: "photo.jpg", rotate: 0 },
      { blob: blob(png), name: "shot.png", rotate: 90 },
      {
        blob: blob(
          new Uint8Array([
            ...ascii("RIFF"),
            0,
            0,
            0,
            0,
            ...ascii("WEBPVP8X"),
            0,
            0,
            0,
            0,
          ]),
        ),
        name: "pic.webp",
        rotate: 0,
      },
    ],
  });
  const ticks: number[] = [];
  const orig = await PDFDocument.load(
    await imagesToPdf(job("original"), codec, (d) => ticks.push(d)),
  );
  check(
    "a page per image, progress reported",
    orig.getPageCount() === 3 && ticks.join() === "1,2,3",
    ticks,
  );
  const imgOf = (d: PDFDocument, i: number) => {
    const xo = d.getPage(i).node.Resources()?.lookup(PDFName.of("XObject"));
    const [ref] = (xo as unknown as { values(): unknown[] }).values();
    return d.context.lookup(ref as never) as PDFRawStream;
  };
  const p0 = imgOf(orig, 0);
  check(
    "untouched JPEG goes in byte for byte",
    p0.dict.get(PDFName.of("Filter")) === PDFName.of("DCTDecode") &&
      p0.contents.length === jpg.length &&
      p0.contents.every((b, i) => b === jpg[i]),
  );
  check(
    "EXIF-rotated JPEG gets a portrait page",
    orig.getPage(0).getWidth() < orig.getPage(0).getHeight(),
  );
  check(
    "rotated screenshot page is portrait too",
    orig.getPage(1).getWidth() < orig.getPage(1).getHeight(),
  );
  const p1 = imgOf(orig, 1);
  check(
    "screenshot stays lossless (Flate)",
    p1.dict.get(PDFName.of("Filter")) === PDFName.of("FlateDecode") &&
      !p1.dict.has(PDFName.of("SMask")),
  );
  const p2 = imgOf(orig, 2);
  check(
    "see-through image gets an alpha mask",
    p2.dict.has(PDFName.of("SMask")) &&
      p2.dict.get(PDFName.of("Filter")) === PDFName.of("FlateDecode"),
  );
  check(
    "untouched mode never re-encodes",
    !calls.some((c) => c.startsWith("jpeg:")),
    calls,
  );

  calls.length = 0;
  const small = await PDFDocument.load(await imagesToPdf(job("small"), codec));
  check(
    "small mode re-encodes photos, keeps screenshots lossless",
    calls.includes("jpeg:400x300") &&
      imgOf(small, 1).dict.get(PDFName.of("Filter")) ===
        PDFName.of("FlateDecode"),
    calls,
  );
  check(
    "photo with transparency: JPEG + mask",
    imgOf(small, 2).dict.get(PDFName.of("Filter")) ===
      PDFName.of("DCTDecode") && imgOf(small, 2).dict.has(PDFName.of("SMask")),
  );
  const sm0 = imgOf(small, 0);
  check(
    "re-saved JPEG kept only when it's smaller",
    sm0.contents.length < jpg.length,
    sm0.contents.length,
  );

  const cm = fakeJpeg(64, 64, { components: 4, adobe: true });
  const cmPdf = await PDFDocument.load(
    await imagesToPdf(
      {
        kind: "images",
        mode: "small",
        layout,
        images: [{ blob: blob(cm), name: "cmyk.jpg", rotate: 0 }],
      },
      codec,
    ),
  );
  const cmImg = imgOf(cmPdf, 0);
  check(
    "CMYK JPEG kept as is, inverted Decode",
    cmImg.dict.get(PDFName.of("ColorSpace")) === PDFName.of("DeviceCMYK") &&
      cmImg.dict.has(PDFName.of("Decode")) &&
      cmImg.contents.length === cm.length,
  );
  let bad = "";
  try {
    await imagesToPdf(
      {
        kind: "images",
        mode: "small",
        layout,
        images: [
          {
            blob: blob(new TextEncoder().encode("not an image at all")),
            name: "notes.txt",
            rotate: 0,
          },
        ],
      },
      codec,
    );
  } catch (e) {
    bad = e instanceof PdfOpError ? e.message : "";
  }
  check("non-image rejected with its name", bad.includes("notes.txt"), bad);
  const info = await imageInfo(
    { kind: "image-info", blob: blob(rotated), name: "r.jpg", thumbPx: 480 },
    codec,
  );
  check(
    "image info: upright size from the header",
    info.info.type === "jpeg" && info.info.w === 3024 && info.info.h === 4032,
    info.info,
  );

  console.log("PDF → image");
  check(
    "file names",
    fileNameFor("{name}-{n}", "report", 3, 120, "png") === "report-003.png" &&
      fileNameFor("", "report", 3, 9, "jpg") === "report-3.jpg",
  );
  check(
    "file names stay safe",
    fileNameFor("a/b:{n}", "x", 1, 1, "webp") === "a-b-1.webp",
  );
  check(
    "quick picks",
    pickQuick("odd", 5).join() === "0,2,4" &&
      pickQuick("even", 5).join() === "1,3" &&
      pickQuick("all", 3).join() === "0,1,2" &&
      pickQuick("none", 3).length === 0,
  );
  const r150 = renderSize(595.28, 841.89, 150, 50e6);
  check(
    "A4 at 150 DPI",
    r150.w === 1240 && r150.h === 1754 && r150.dpi === 150,
    r150,
  );
  const capped = renderSize(2384, 3370, 300, 16_777_216);
  check(
    "huge page capped to what the browser can draw, honestly",
    capped.w * capped.h <= 16_777_216 && capped.dpi < 300 && capped.capped,
    capped,
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

void main();
