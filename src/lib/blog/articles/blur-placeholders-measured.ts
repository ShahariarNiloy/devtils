import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

const NEXT_IMAGE_DOCS = "https://nextjs.org/docs/app/api-reference/components/image#blurdataurl";
const RFC_WEBP = "https://www.rfc-editor.org/rfc/rfc9649.html";
const THUMBHASH = "https://github.com/evanw/thumbhash";
const BLURHASH = "https://github.com/woltapp/blurhash";

const SSR_OUTPUT = `<img alt="…" loading="lazy" width="768" height="512" decoding="async" data-nimg="1"
  style="color:transparent;background-size:cover;background-position:50% 50%;
  background-repeat:no-repeat;background-image:url(&quot;data:image/svg+xml;charset=utf-8,
  %3Csvg xmlns=&#x27;http://www.w3.org/2000/svg&#x27; viewBox=&#x27;0 0 768 512&#x27;%3E
  %3Cfilter id=&#x27;b&#x27; color-interpolation-filters=&#x27;sRGB&#x27;%3E
  %3CfeGaussianBlur stdDeviation=&#x27;20&#x27;/%3E … %3CfeGaussianBlur stdDeviation=&#x27;20&#x27;/%3E
  %3C/filter%3E%3Cimage … preserveAspectRatio=&#x27;none&#x27; style=&#x27;filter: url(%23b);&#x27;
  href=&#x27;data:image/png;base64,…&#x27;/%3E%3C/svg%3E&quot;)" src="…"/>`;

const WEBP_DISSECT = `// Paste into a Chrome DevTools console.
const c = document.createElement("canvas");
c.width = 4;
c.height = 3;
const ctx = c.getContext("2d");
ctx.fillStyle = "#776c58";
ctx.fillRect(0, 0, 4, 3);
ctx.fillStyle = "#4a6f8c";
ctx.fillRect(0, 0, 4, 1);

const url = c.toDataURL("image/webp", 0.7);
const b = Uint8Array.from(atob(url.split(",")[1]), (ch) => ch.charCodeAt(0));
const dv = new DataView(b.buffer);
const tag = (o) => String.fromCharCode(...b.subarray(o, o + 4));
console.log(url.length, "chars,", b.length, "bytes");
for (let o = 12; o + 8 <= b.length; ) {
  const n = dv.getUint32(o + 4, true); // chunk size, little-endian
  console.log(\`  \${tag(o)} \${n} bytes\`);
  o += 8 + n + (n & 1); // odd chunks carry one padding byte
}`;

const WEBP_DISSECT_OUT = `743 chars, 538 bytes
  VP8X 10 bytes
  ICCP 456 bytes
  VP8  36 bytes`;

const WEBP_STRIP = `// Opaque, still, lossy WebP only: keep the "VP8 " chunk, drop VP8X and ICCP.
function stripWebp(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag = (o) => String.fromCharCode(...b.subarray(o, o + 4));
  for (let o = 12; o + 8 <= b.length; ) {
    const n = dv.getUint32(o + 4, true);
    if (tag(o) === "VP8 ") {
      const chunk = b.subarray(o, o + 8 + n + (n & 1));
      const out = new Uint8Array(12 + chunk.length);
      out.set(b.subarray(0, 12)); // "RIFF" <size> "WEBP"
      new DataView(out.buffer).setUint32(4, out.length - 8, true);
      out.set(chunk, 12);
      return out;
    }
    o += 8 + n + (n & 1);
  }
  return b; // lossless (VP8L) or alpha: leave it alone
}
const slim = stripWebp(b);
const slimUrl = "data:image/webp;base64," + btoa(String.fromCharCode(...slim));
console.log(slimUrl.length, "chars after stripping");

// Same pixels? Decode both and compare.
const read = async (u) => {
  const bmp = await createImageBitmap(await (await fetch(u)).blob());
  const k = new OffscreenCanvas(4, 3).getContext("2d");
  k.drawImage(bmp, 0, 0);
  return k.getImageData(0, 0, 4, 3).data;
};
const [x, y] = await Promise.all([read(url), read(slimUrl)]);
console.log("identical pixels:", x.every((v, i) => v === y[i]));`;

const WEBP_STRIP_OUT = `99 chars after stripping
identical pixels: true`;

const HERO = `import Image from "next/image";

// Remote src: allow its host in images.remotePatterns (next.config).
// 4×3 PNG made at build time (or pasted from the tool): 162 characters.
const blurDataURL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAL0lEQVR4AWOoba8vqGuYNn9C68R2hqyMyPTMmIKc8Lr6XAZbW2NzK2MPLzsPbwcAPtUOPJbCAWYAAAAASUVORK5CYII=";

export function Hero() {
  return (
    <Image
      src="https://images.example.com/kodim16.jpg"
      width={768}
      height={512}
      alt="Palm trees on a small island under clouds"
      placeholder="blur"
      blurDataURL={blurDataURL}
    />
  );
}`;

const TH_DECODE = `import { thumbHashToDataURL, thumbHashToApproximateAspectRatio, thumbHashToRGBA } from "thumbhash";

// The ThumbHash for Kodak image 1 (768×512), as stored in a text column.
const stored = "2hgGDYB4dWiPd5dleGiIl1lvo/JE";
const hash = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));

const { w, h } = thumbHashToRGBA(hash);
console.log(hash.length, "bytes; decodes to", w, "x", h);
console.log("aspect ratio ≈", thumbHashToApproximateAspectRatio(hash).toFixed(3));
const url = thumbHashToDataURL(hash);
console.log(url.slice(0, 22), "…", url.length, "chars");`;

const TH_DECODE_OUT = `21 bytes; decodes to 32 x 23
aspect ratio ≈ 1.400
data:image/png;base64, … 4218 chars`;

const TH_COMPONENT = `"use client";
import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { thumbHashToDataURL } from "thumbhash";

type Props = Omit<ImageProps, "placeholder" | "blurDataURL"> & { thumbhash: string };

export function ThumbImage({ thumbhash, alt, ...rest }: Props) {
  // Decode in the browser: the HTML carries 28 characters, not ~4 KB.
  const [blur, setBlur] = useState<string>();
  useEffect(() => {
    const bytes = Uint8Array.from(atob(thumbhash), (c) => c.charCodeAt(0));
    setBlur(thumbHashToDataURL(bytes));
  }, [thumbhash]);
  return <Image {...rest} alt={alt} placeholder={blur ? "blur" : "empty"} blurDataURL={blur} />;
}`;

export const post: BlogPost = {
  slug: "blur-placeholders-measured",
  title: "Blur placeholders, measured: Base64 vs ThumbHash vs BlurHash",
  description:
    "Byte counts and colour error for 4px PNG, WebP and JPEG, ThumbHash, BlurHash and CSS on 12 photos, plus the 456-byte profile Chrome adds to canvas WebP.",
  date: "2026-11-22",
  author: "The utilyx team",
  tags: ["Images", "Performance", "Next.js"],
  readingTime: "12 min",
  cover: "blur",
  tool: { name: "Blur placeholder", glyph: "blur", tint: "clay", href: "/tools/blur-placeholder" },
  blocks: [
    {
      k: "p",
      s: [
        "You add ",
        code('placeholder="blur"'),
        " to a gallery of remote images, paste in a ",
        code("blurDataURL"),
        " from somewhere, and view source. Every ",
        code("<img>"),
        " now carries more than a kilobyte of inline style, and the page has 40 of them. Is that the placeholder's fault, or Next.js's? Would WebP be smaller? Is ThumbHash the fix everyone says it is?",
      ],
    },
    {
      k: "p",
      s: [
        "We built a ",
        a("blur placeholder generator", "/tools/blur-placeholder"),
        ", so we measured. The short version: a 4-pixel PNG is mostly packaging, lossy formats are smaller but shift colours, Chrome hides a 456-byte colour profile in canvas WebP and JPEG output, and ThumbHash's 28 characters can turn into 4 KB if you decode them in the wrong place.",
      ],
    },
    {
      k: "note",
      s: [
        strong("Setup."),
        " The 12 PNG photos from the public ",
        a("Kodak lossless true colour suite", "https://r0k.us/graphics/kodak/"),
        " (10 landscape at 768×512, 2 portrait at 512×768). Each was decoded and downscaled the way our tool does it (Chrome's ",
        code("createImageBitmap"),
        " to 256 px, then an area-average to 100 px), and every format was produced by the tool's own code. WebP and JPEG came from canvas ",
        code("toDataURL(type, 0.7)"),
        " in Chrome 158 on Linux. No saturation boost, so pixels compare exactly. Sizes are data-URL characters, which is what lands in your HTML.",
      ],
    },
    { k: "h2", v: "What Next.js does with your blurDataURL", id: "what-next-does" },
    {
      k: "p",
      s: [
        "The usual setup for a remote image looks like this. The data URL is a real 4 px placeholder for Kodak image 16:",
      ],
    },
    { k: "code", lang: "tsx", v: HERO },
    {
      k: "p",
      s: [
        "We server-rendered that component with ",
        code("react-dom/server"),
        " against Next.js 16.4.6. Here is the ",
        code("<img>"),
        " it produced, shortened:",
      ],
    },
    { k: "code", lang: "html", v: SSR_OUTPUT },
    {
      k: "p",
      s: [
        "Next doesn't show your image directly. It wraps it in an SVG (",
        code("getImageBlurSvg"),
        " in ",
        code("next/dist/shared/lib/image-blur-svg.js"),
        ") that stretches it to the box and runs it through ",
        code("feGaussianBlur stdDeviation='20'"),
        " twice. That wrapper costs 922 characters per image before your data URL is even counted: the same tag rendered without a placeholder is 156 characters, with the 162-character PNG it is 1,240.",
      ],
    },
    {
      k: "p",
      s: [
        "The detail that matters is the ",
        code("viewBox"),
        ", because the blur radius is measured in its units:",
      ],
    },
    {
      k: "ul",
      items: [
        [
          strong("Static imports"),
          " (",
          code('import pic from "./pic.jpg"'),
          "): Next makes the placeholder itself, 8 px on the long side at quality 70 (",
          code("BLUR_IMG_SIZE"),
          " and ",
          code("BLUR_QUALITY"),
          " in ",
          code("next-image-loader/blur.js"),
          "), and sets the viewBox to 40× that, 320×200 for a 3:2 photo. A 20-unit blur is 6% of the width.",
        ],
        [
          strong("A blurDataURL you supply"),
          ": the viewBox is your ",
          code("width"),
          " and ",
          code("height"),
          " props. At ",
          code("width={768}"),
          " the same blur is 2.6% of the width; at ",
          code("width={3000}"),
          ", 0.7%. With ",
          code("fill"),
          " and no size there is no viewBox, and the blur is 20 CSS pixels.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "So for remote images, the blur is weaker than for static imports, and its strength depends on a prop you set for layout reasons. The ",
        a("Image docs", NEXT_IMAGE_DOCS),
        " say “a very small image (10px or less) is recommended” and “A large blurDataURL may hurt performance.” One more cost: ",
        code("next/image"),
        " is a client component (",
        code("'use client'"),
        " at the top of ",
        code("next/dist/client/image-component.js"),
        "), so when a Server Component renders it, its props, ",
        code("blurDataURL"),
        " included, are also serialized into the RSC payload in the page.",
      ],
    },
    { k: "h2", v: "A 4×3 PNG is mostly packaging", id: "png-is-packaging" },
    {
      k: "p",
      s: [
        "Shrink a 768×512 photo to 4 px wide and you get 4×3 pixels: 36 bytes of RGB, 39 with PNG's filter byte per row. The PNG file is 104 bytes. The difference is fixed structure: the 8-byte signature, the IHDR chunk (25 bytes), and 12 bytes each of chunk framing for IDAT and IEND. That's 57 bytes before any pixel data.",
      ],
    },
    {
      k: "p",
      s: [
        "Compression doesn't help at this size. Our encoder tries every row filter and keeps the smaller of a stored or Huffman-coded deflate stream; the IDAT came out at 47 or 48 bytes, ",
        em("larger"),
        " than the 39 raw bytes, because zlib adds a 2-byte header and a 4-byte checksum. Node's ",
        code("zlib.deflateSync"),
        " at level 9 on the same rows gave 47 to 50 bytes. Base64 then adds a third, and the ",
        code("data:image/png;base64,"),
        " prefix 22 characters.",
      ],
    },
    {
      k: "table",
      head: [["Width"], ["Pixels (landscape)"], ["PNG bytes"], ["Data URL chars"], ["Portrait (512×768)"]],
      rows: [
        [["4 px"], ["4×3"], ["104–105"], ["162"], ["4×6: 210–214 chars"]],
        [["8 px"], ["8×5"], ["185–193"], ["270–282"], ["8×12: 510–514 chars"]],
        [["16 px"], ["16×11"], ["513–607"], ["706–834"], ["16×24: 1,674–1,682 chars"]],
      ],
    },
    {
      k: "p",
      s: [
        "At 4 px, all ten landscape photos produced exactly 162 characters. The image content barely registers; the container is the size.",
      ],
    },
    { k: "h2", v: "WebP is smaller, JPEG isn't, and both shift colour", id: "webp-and-jpeg" },
    {
      k: "p",
      s: [
        "Lossy WebP is the obvious next step. We encoded the same 4 px pixels through canvas WebP and JPEG, decoded the results back in Chrome, and compared them with the exact pixels the PNG stores. Error is mean absolute difference per RGB channel on a 0–255 scale, averaged over the 12 photos.",
      ],
    },
    {
      k: "table",
      head: [["4 px, 12 photos"], ["As the browser encodes it"], ["Metadata stripped"], ["Mean error"], ["Worst pixel"]],
      rows: [
        [["PNG"], ["162–214 chars"], ["(none to strip)"], ["0"], ["0"]],
        [["WebP q0.7"], ["743–767"], ["103–123"], ["6.79"], ["44"]],
        [["JPEG q0.7"], ["1,051–1,075"], ["395–419"], ["7.50"], ["38"]],
      ],
    },
    {
      k: "p",
      s: [
        "Stripped WebP is a quarter to a half smaller than PNG. But on a 4×3 image every pixel is a large share of the picture, and a channel off by 44 out of 255 is a visible hue change. At 8 px it got worse, not better: WebP's worst pixel was off by 60, JPEG's by 78. VP8 encodes colour at half resolution (4:2:0), which is a lot to lose when there are only 12 pixels.",
      ],
    },
    {
      k: "p",
      s: [
        "JPEG loses on both counts. Even stripped, its two quantization tables (67 bytes each), frame header and four Huffman tables outweigh the pixels. The scan, header included, was 25 to 38 bytes.",
      ],
    },
    { k: "h2", v: "The 456 bytes Chrome puts in your WebP", id: "icc-profile" },
    {
      k: "p",
      s: [
        "The “as the browser encodes it” column is not a typo. Here's where the bytes go. A WebP file is a RIFF container: ",
        code("RIFF"),
        ", a little-endian size, ",
        code("WEBP"),
        ", then chunks of a 4-byte tag, a 4-byte size and the payload, padded to an even length (",
        a("RFC 9649 §2.3–2.4", RFC_WEBP + "#name-riff-file-format"),
        "). This lists them:",
      ],
    },
    { k: "code", lang: "js", v: WEBP_DISSECT },
    { k: "code", lang: "text", v: WEBP_DISSECT_OUT },
    {
      k: "p",
      s: [
        "The image is 36 bytes. Chrome wrapped it in the extended format: a ",
        code("VP8X"),
        " header whose ICC flag is set, and an ",
        code("ICCP"),
        " chunk with a 456-byte ICC profile. Reading its header, it's a display-class RGB profile with the description “sRGB”. JPEG gets the same profile in an APP2 segment (",
        code("ICC_PROFILE"),
        " identifier, then the 456 bytes; 472 with its header). One quirk we saw: a canvas you never drew on is encoded without the profile; once you draw, it's there.",
      ],
    },
    {
      k: "p",
      s: [
        "You can drop it. The RFC says that without an ICCP chunk “sRGB SHOULD be assumed” (",
        a("§2.7.1.4", RFC_WEBP + "#name-color-profile"),
        "), and CSS Color 4 says “untagged images must be treated as being in the sRGB color space” (",
        a("§3.5", "https://www.w3.org/TR/css-color-4/#untagged"),
        "). For an opaque, still, lossy image, the minimal file is just the RIFF header and the ",
        code("VP8 "),
        " chunk (",
        a("§2.5, simple format", RFC_WEBP + "#name-simple-file-format-lossy"),
        "):",
      ],
    },
    { k: "code", lang: "js", v: WEBP_STRIP },
    { k: "code", lang: "text", v: WEBP_STRIP_OUT },
    {
      k: "p",
      s: [
        "743 characters down to 99, same pixels. Images with alpha need the VP8X and ALPH chunks kept, with the ICC bit cleared in the flags; our tool's ",
        code("slimWebp"),
        " handles that case and the JPEG one (it drops APP0, APP1, APP2 and comments). If you generate placeholders with sharp on a server, sharp leaves metadata out unless you ask for it with ",
        code("withMetadata()"),
        "; this is a browser-canvas problem.",
      ],
    },
    { k: "h2", v: "How close does each one look?", id: "fidelity" },
    {
      k: "p",
      s: [
        "Byte counts don't say what the placeholder looks like. To compare, we rendered each one at 768×512 in Chrome the way it is shown in practice (the Base64 formats and ThumbHash through Next's SVG at ",
        code("width={768}"),
        ", BlurHash decoded at 32 px wide and stretched, the colour as a fill), and measured mean absolute error against the real photo. No placeholder can show texture, so nothing gets near zero; lower is closer.",
      ],
    },
    {
      k: "table",
      head: [["Placeholder"], ["Size"], ["Mean error vs photo"]],
      rows: [
        [["Average colour"], ["7 chars"], ["38.55"]],
        [["BlurHash 4×3"], ["28 chars"], ["30.76"]],
        [["WebP 4 px, stripped"], ["103–123 chars"], ["29.76"]],
        [["PNG 4 px"], ["162–214 chars"], ["28.67"]],
        [["ThumbHash"], ["28 chars"], ["28.01"]],
        [["PNG 8 px"], ["270–514 chars"], ["25.48"]],
        [["PNG 16 px"], ["706–1,682 chars"], ["22.36"]],
      ],
    },
    {
      k: "p",
      s: [
        "8 px was closer than 4 px on all 12 photos, about 11% on average, for 1.7× the characters on landscape images and 2.4× on portrait. Plaiceholder defaults to 4 (",
        code("size = 4"),
        " in its v3 source), and so do we. On a page with dozens of images we'd keep 4; for one hero image, 8 is cheap.",
      ],
    },
    {
      k: "p",
      s: [
        "Next's blur barely moved this number. A 4 px PNG simply stretched by the browser scored within 0.2 of the same PNG through Next's filter. What the filter fixes is shape: stretched by itself, a 4×3 image shows the faint cross-shaped creases of bilinear scaling, and the blur softens them into a smooth wash.",
      ],
    },
    { k: "h2", v: "ThumbHash vs BlurHash", id: "thumbhash-vs-blurhash" },
    {
      k: "p",
      s: [
        "Both encode a few frequency components as a short string you can keep in a database column next to width and height. On our 12 photos both were exactly 28 characters: BlurHash at its README's recommended 4×3 components (“We usually go with 4 by 3”), and ThumbHash as 21 bytes in Base64. ThumbHash's README makes four claims against BlurHash: more detail in the same space, aspect ratio encoded, more accurate colours, and alpha support. What we could check:",
      ],
    },
    {
      k: "ul",
      items: [
        [
          strong("Detail and colour."),
          " ThumbHash was closer to the photo than BlurHash on all 12, and closer than a 162-character 4 px PNG on 7 of 12. On Kodak 16 (palm trees over dark water), BlurHash decoded a near-black blue blob into the water at the bottom; the darkest decoded pixel was ",
          code("rgb(0, 0, 29)"),
          ". We reproduced that with the npm ",
          code("blurhash"),
          " 2.0.5 package, not just our port, so it comes from the format, not our code.",
        ],
        [
          strong("Aspect ratio, approximately."),
          " ThumbHash picks its component counts from the shape, so you can recover it, roughly. For a 3:2 photo it said 1.400, not 1.5. Still store width and height.",
        ],
        [
          strong("Alpha."),
          " ThumbHash has an optional alpha channel. BlurHash's README doesn't mention transparency; it encodes RGB only, so our tool composites transparent images onto a background first.",
        ],
        [
          strong("Configurability."),
          " ThumbHash's README names its own drawback: “the parameters of the algorithm are not configurable.” BlurHash lets you trade length for detail, 1 to 9 components each way. ThumbHash also refuses input larger than 100×100 (",
          code("doesn't fit in 100x100"),
          "), so you downscale first.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "The catch with both is that a browser can't display them. You need a decoder, and where you run it decides what you saved. Here's the ThumbHash package decoding a stored hash:",
      ],
    },
    { k: "code", lang: "js", v: TH_DECODE },
    { k: "code", lang: "text", v: TH_DECODE_OUT },
    {
      k: "p",
      s: [
        "21 bytes became a 4,218-character data URL: ",
        code("thumbHashToDataURL"),
        " writes an uncompressed 32×23 PNG. Do that on the server and pass it as ",
        code("blurDataURL"),
        ", and you ship 26 times the bytes of a 4 px PNG. Compressed with Brotli at quality 11, the 12 decoded ThumbHashes came to 26,400 bytes; the 12 PNGs to 834.",
      ],
    },
    {
      k: "p",
      s: [
        "A client component doesn't fix it on its own, because client components also render on the server. To keep the HTML at 28 characters, decode after hydration:",
      ],
    },
    { k: "code", lang: "tsx", v: TH_COMPONENT },
    {
      k: "p",
      s: [
        "The trade-off is timing: this placeholder appears only after your JavaScript runs, while a Base64 PNG paints with the first HTML. ThumbHash wins when the string travels through an API or a database and the client decodes it anyway (a feed, a mobile app). For server-rendered pages, the 4 px PNG is hard to beat.",
      ],
    },
    { k: "h2", v: "No JavaScript at all: colour, CSS, SVG", id: "no-javascript" },
    {
      k: "ul",
      items: [
        [
          strong("Average colour"),
          ", 7 characters as ",
          code("background-color"),
          ". It was the least faithful in our table and worst on images with two big regions: on Kodak 20 its error was 83, against 31 for the 4 px PNG. Still a big step up from an empty box, and nearly free.",
        ],
        [
          strong("CSS gradients"),
          ": one hard-stop ",
          code("linear-gradient"),
          " per row of a 4×3 grid plus a CSS blur, 411 characters as our tool writes them. Paints with the HTML, no image decode.",
        ],
        [
          strong("Inline SVG"),
          ": an 8-pixel grid of ",
          code("<rect>"),
          "s under ",
          code("feGaussianBlur"),
          ", 2,797 characters URL-encoded. Readable and works in any ",
          code("src"),
          ", but it's the largest option here.",
        ],
      ],
    },
    { k: "h2", v: "What we'd use, and our tool's limits", id: "recommendations" },
    {
      k: "ul",
      items: [
        [
          strong("Server-rendered Next.js with remote images:"),
          " a 4 px PNG as ",
          code("blurDataURL"),
          ", 162 characters for a 3:2 image. Exact colours, no decoder.",
        ],
        [
          strong("Bytes really matter and you can live with colour drift:"),
          " WebP, ",
          em("with the ICC chunk stripped"),
          ". Without stripping it's 4.6 times the PNG.",
        ],
        [
          strong("Placeholders stored in a database or sent in API responses:"),
          " ThumbHash, decoded on the client.",
        ],
        [
          strong("Static imports:"),
          " let Next do it.",
        ],
      ],
    },
    { k: "p", s: ["Where our own numbers come with caveats:"] },
    {
      k: "ul",
      items: [
        [
          strong("The Base64 image is made in your browser."),
          " Our PNG encoder is exact, but its bytes differ from what sharp (and so plaiceholder) writes, and WebP and JPEG depend on the browser's encoder. Firefox and Safari may give other sizes.",
        ],
        [
          strong("Sizing differs from plaiceholder for portrait images."),
          " We set the width and derive the height (4×6 for a 2:3 photo); plaiceholder fits the image inside a 4×4 box (3×4).",
        ],
        [
          strong("Defaults."),
          " Our tool, like plaiceholder v3, boosts saturation 1.2× by default, because averaging greys colours out. We turned that off for these measurements; at 4 px it changed the PNG length on one photo of 12, by 4 characters.",
        ],
        [
          strong("The hashes are exact ports"),
          " of the ",
          a("thumbhash", THUMBHASH),
          " and ",
          a("blurhash", BLURHASH),
          " packages and match their output, but you still ship one of those decoders to show them.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Our ",
        a("blur placeholder tool", "/tools/blur-placeholder"),
        " shows all six formats for an image side by side, with every Base64 format's real length, and writes the Next.js, React or HTML code. Nothing is uploaded.",
      ],
    },
  ],
};
