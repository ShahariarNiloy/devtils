import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

const DITHER_DEMO = `import { deflateSync } from "node:zlib";

// A 512×64 grey ramp from 40 to 80: a dark, smooth sky.
const W = 512, H = 64;
const src = (x) => 40 + (40 * x) / (W - 1);
// Only 8 grey levels to choose from (a starved palette).
const pal = [40, 46, 52, 58, 63, 69, 75, 80];
const nearest = (v) =>
  pal.reduce((b, p, i) => (Math.abs(p - v) < Math.abs(pal[b] - v) ? i : b), 0);

function quantize(dither) {
  const out = new Uint8Array(W * H);
  let err = new Float64Array(W + 2), next = new Float64Array(W + 2);
  for (let y = 0; y < H; y++) {
    next.fill(0);
    for (let x = 0; x < W; x++) {
      const v = src(x) + (dither ? err[x + 1] : 0);
      const i = nearest(v);
      out[y * W + x] = i;
      if (!dither) continue;
      const e = v - pal[i]; // Floyd–Steinberg weights
      err[x + 2] += (e * 7) / 16;
      next[x] += (e * 3) / 16;
      next[x + 1] += (e * 5) / 16;
      next[x + 2] += (e * 1) / 16;
    }
    [err, next] = [next, err];
  }
  return out;
}

for (const dither of [false, true]) {
  const idx = quantize(dither);
  // Mean of each column vs the true ramp: how well the eye's average matches.
  let worst = 0;
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = 0; y < H; y++) s += pal[idx[y * W + x]];
    worst = Math.max(worst, Math.abs(s / H - src(x)));
  }
  console.log(
    dither ? "dithered:  " : "no dither: ",
    "deflate", deflateSync(idx, { level: 9 }).length, "bytes,",
    "worst column error", worst.toFixed(2), "levels",
  );
}`;

const OKLAB_DEMO = `// sRGB 0–255 → OKLab (Björn Ottosson, 2020).
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklab([r, g, b]) {
  [r, g, b] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

const pairs = [
  ["dark grey", [20, 20, 20], [40, 40, 40]],
  ["light grey", [215, 215, 215], [235, 235, 235]],
  ["green", [0, 200, 0], [0, 220, 0]],
  ["blue", [0, 0, 200], [0, 0, 220]],
];
for (const [name, a, b] of pairs) {
  console.log(
    name.padEnd(11),
    "RGB dist", dist(a, b).toFixed(1).padStart(5),
    "  OKLab ΔE", dist(oklab(a), oklab(b)).toFixed(4),
  );
}`;

export const post: BlogPost = {
  slug: "how-lossy-png-compression-works",
  seoTitle: "How lossy PNG compression works, and why it looks lossless",
  title: "How lossy PNG compression works (and why 256 colours can look lossless)",
  description:
    "PNG is lossless, yet tools shrink it 60–70% with no visible change. Palettes, dithering, banding and honest metrics, from our own quantizer.",
  date: "2026-11-21",
  author: "The utilyx team",
  tags: ["Images", "Engineering", "Performance"],
  readingTime: "9 min",
  cover: "png",
  tool: { name: "Image compressor", glyph: "png", tint: "rose", href: "/tools/image-compressor" },
  blocks: [
    {
      k: "p",
      s: [
        "You export a PNG and it weighs 580 KB. You drop it into a compressor, get back 200 KB, and flip between the two. You can't tell them apart. Then you try it on a picture with a big blue sky, and the sky comes back as a staircase of stripes.",
      ],
    },
    {
      k: "p",
      s: [
        "Both come from the same trick: keep at most 256 colours and write an indexed PNG. Whether that looks lossless depends on which colours you keep and how you place them. We recently rewrote the quantizer behind our image compressor. Here is how it works, with numbers from our benchmark, including where we lose.",
      ],
    },
    { k: "h2", v: "How PNG compresses at all", id: "how-png-compresses-at-all" },
    {
      k: "p",
      s: [
        "PNG compression is lossless and has two stages. First, each scanline is ",
        strong("filtered"),
        ": one of five filters (None, Sub, Up, Average, Paeth; ",
        a("PNG spec §9.2", "https://www.w3.org/TR/png-3/#9Filter-types"),
        ") replaces every byte with its difference from a prediction based on the pixel to the left, the one above, or both. Then the filtered bytes go through ",
        strong("DEFLATE"),
        ", the same LZ77 + Huffman coding used by zip and gzip (",
        a("§10.1", "https://www.w3.org/TR/png-3/#10Compression"),
        ").",
      ],
    },
    {
      k: "p",
      s: [
        "That works well on screenshots and logos: flat fills filter to runs of zeros, and repeated elements become back-references. It works poorly on photos. Camera noise lives in the low bits of every pixel, the filtered residuals look random, and DEFLATE can't compress randomness.",
      ],
    },
    {
      k: "p",
      s: [
        "On the 12 Kodak photos in our benchmark (768×512, 1,179,648 bytes of raw RGB each), lossless PNG through oxipng level 4 still takes 40% to 68% of the raw size (474,682 to 800,641 bytes), 55% on average.",
      ],
    },
    {
      k: "p",
      s: [
        "So lossy PNG doesn't touch the compressor. It changes the ",
        em("pixels"),
        " so the compressor has less to do.",
      ],
    },
    { k: "h2", v: "Palette PNG: 256 colours and a tRNS chunk", id: "palette-png" },
    {
      k: "p",
      s: [
        "A truecolour PNG stores 3 or 4 bytes per pixel. An ",
        strong("indexed"),
        " PNG (colour type 3) stores one byte per pixel: an index into a ",
        code("PLTE"),
        " chunk of at most 256 RGB entries. Alpha goes in an optional ",
        code("tRNS"),
        " chunk with one alpha byte per palette entry. Per ",
        a("§11.3.1.1", "https://www.w3.org/TR/png-3/#11tRNS"),
        ", tRNS may hold fewer values than the palette has entries, and the missing ones are assumed to be 255 (opaque). So if you sort translucent entries to the front, the opaque ones cost nothing.",
      ],
    },
    {
      k: "p",
      s: [
        "Here are the chunks of the Python logo from our benchmark, before and after quantization, as listed by a short Node script that reads each chunk's length, type and IHDR fields:",
      ],
    },
    {
      k: "code",
      lang: "text",
      v: "original a_python.png  (68,380 bytes)\nIHDR     13 bytes  960×960, bit depth 8, truecolour+alpha\nIDAT  65536 bytes\nIDAT   2775 bytes\nIEND      0 bytes\n\nquantized a_python.png  (13,928 bytes)\nIHDR     13 bytes  960×960, bit depth 8, indexed\nPLTE     78 bytes  26 entries\ntRNS     12 bytes  alpha for the first 12 entries\nIDAT  13757 bytes\nIEND      0 bytes",
    },
    {
      k: "p",
      s: [
        "The original has 2,861 distinct RGBA values, 2,762 of them semi-transparent edge pixels. 26 entries reproduce it at a SSIMULACRA2 score of 84.52 (more on that metric below). Pixels went from 4 bytes to 1, the indices repeat far more often, and only 12 entries need a tRNS byte.",
      ],
    },
    {
      k: "p",
      s: [
        "A photo is harder. Kodak image 16 (palm trees, sea and sky) has 14,096 distinct colours. Ours gets it down to 209.",
      ],
    },
    { k: "h2", v: "Choosing the 256 colours", id: "choosing-the-palette" },
    {
      k: "p",
      s: [
        "Picking the palette is clustering: every distinct colour is a point weighted by its pixel count, and you want k centres that minimise total squared error. Ours has four parts.",
      ],
    },
    { k: "h3", v: "1. Median cut, then k-means" },
    {
      k: "p",
      s: [
        "Median cut comes from Paul Heckbert's ",
        a(
          "“Color Image Quantization for Frame Buffer Display”",
          "https://doi.org/10.1145/965145.801294",
        ),
        " (SIGGRAPH 1982): put all colours in one box, keep splitting boxes until you have k, and use each box's average as an entry. We split the box with the largest weighted squared error, at the cut (over 64 bins per axis) that minimises the two halves' combined error. That's the variance-minimising variant, not a literal median.",
      ],
    },
    {
      k: "p",
      s: [
        "Median cut is greedy, so an early bad split sticks. We follow it with up to six rounds of weighted k-means (assign each colour to its nearest entry, move each entry to the mean of its colours), stopping once a round improves error by under 0.2%. All of it runs on a histogram of at most 32,768 colours, not on raw pixels.",
      ],
    },
    { k: "h3", v: "2. Measure distance where the eye does" },
    {
      k: "p",
      s: [
        "“Nearest” depends on the space you measure in. In sRGB, equal numeric steps aren't equal visible steps. We work in ",
        a("OKLab", "https://bottosson.github.io/posts/oklab/"),
        " (Björn Ottosson, 2020), where Euclidean distance roughly tracks perceived difference:",
      ],
    },
    { k: "code", lang: "js", v: OKLAB_DEMO },
    {
      k: "code",
      lang: "text",
      v: "dark grey   RGB dist  34.6   OKLab ΔE 0.0856\nlight grey  RGB dist  34.6   OKLab ΔE 0.0609\ngreen       RGB dist  20.0   OKLab ΔE 0.0565\nblue        RGB dist  20.0   OKLab ΔE 0.0339",
    },
    {
      k: "p",
      s: [
        "RGB calls each pair equally far apart. OKLab rates the dark-grey step 1.4× as visible as the light-grey one, and the green step 1.7× the blue one, so an OKLab palette spends more entries where a missing one would show.",
      ],
    },
    { k: "h3", v: "3. Treat alpha as compositing error" },
    {
      k: "p",
      s: [
        "A pixel at 5% opacity barely shows; an opaque edge pixel is fully visible. We store colours ",
        strong("premultiplied"),
        " (OKLab scaled by alpha), with lightness measured against a dark and a light grey backdrop, so plain Euclidean distance equals the average error you'd see after compositing over both.",
      ],
    },
    {
      k: "p",
      s: [
        "Opaque pixels may only map to opaque entries, so a solid pixel never turns slightly see-through.",
      ],
    },
    { k: "h3", v: "4. Use as few colours as the quality target allows" },
    {
      k: "p",
      s: [
        "The quality setting (1–100; our Balanced mode is 85) maps to a target mean squared error, and we use the fewest colours that meet it. Flat fills count at 1% weight here, since any palette reproduces them exactly. Leftover budget goes to small, distinct colours the target ignored, like a few red flowers in a field: squared error barely notices them, your eye sees a hue shift.",
      ],
    },
    {
      k: "note",
      s: [
        strong("Prior art."),
        " pngquant and its library libimagequant, by Kornel Lesiński, have used ",
        a("a modified median cut with Voronoi (k-means) refinement", "https://pngquant.org/"),
        ", premultiplied alpha and selective dithering for years. They're the reference we benchmark against. Ours is an independent TypeScript implementation built from those published techniques. It uses none of their code.",
      ],
    },
    { k: "h2", v: "Dithering, and why it costs bytes", id: "dithering" },
    {
      k: "p",
      s: [
        "Mapping each pixel to its nearest entry turns smooth gradients into steps. ",
        strong("Error diffusion"),
        " fixes that. Floyd–Steinberg dithering (1976) takes the error left at each pixel and pushes it onto the neighbours that haven't been mapped yet: 7/16 to the right, and 3/16, 5/16 and 1/16 to the pixels below. Neighbouring pixels then alternate between two palette entries, and the eye averages them back into the missing shade.",
      ],
    },
    {
      k: "p",
      s: [
        "The cost is that a dithered area is noise, and DEFLATE can't compress noise. This Node script quantizes a dark grey ramp to 8 levels with and without Floyd–Steinberg:",
      ],
    },
    { k: "code", lang: "js", v: DITHER_DEMO },
    {
      k: "code",
      lang: "text",
      v: "no dither:  deflate 184 bytes, worst column error 3.00 levels\ndithered:   deflate 4266 bytes, worst column error 0.89 levels",
    },
    {
      k: "p",
      s: [
        "Dithering made the ramp 23× bigger, and accurate: averaged down each column it stays within 0.89 grey levels of the true ramp, against 3 without. So ours dithers only where it pays:",
      ],
    },
    {
      k: "ul",
      items: [
        [
          strong("Contrast-adaptive strength."),
          " Strength depends on a pixel's brightness difference from its four neighbours: strongest up to 6 levels, none from 48. The overall level also rises with the share of smooth shading in the image. Texture already hides banding, so dithering it only costs bytes.",
        ],
        [
          strong("A dead zone for flat fills."),
          " In a flat area, if an entry is already very close, we write it and diffuse nothing. Otherwise a logo colour just off a palette entry grows a checkerboard.",
        ],
        [
          strong("Clamped residuals and a speckle guard."),
          " Carried error is capped, and a dithered pick may stray only a bounded step from the plain nearest entry, which stops lone off-colour dots at gamut and alpha edges.",
        ],
        [
          strong("Serpentine scanning."),
          " Alternate rows run right-to-left, which breaks up the diagonal “worms” plain Floyd–Steinberg leaves.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "The dead zone alone matters more than you'd expect. In one build during tuning, with dithering forced to full strength everywhere, the Firefox logo came out at 120,560 bytes and SSIMULACRA2 66.68. Turning on just the dead zone gave 56,457 bytes and 80.82: less than half the size, and visibly cleaner.",
      ],
    },
    { k: "h2", v: "Banding, and our stricter target for gradients", id: "banding" },
    {
      k: "p",
      s: [
        "Banding is the most visible failure, and an average-error target misses it: a photo can score well on average over a busy forest and still turn its sky into contour lines.",
      ],
    },
    {
      k: "p",
      s: [
        "So the palette has a second target. Pixels that aren't flat fills and differ from their neighbours by at most 6 brightness levels count as smooth. When they're over 2% of the image, the palette must also meet a stricter error target measured on them alone. We set it by eye on Kodak skies and clouds at 4× zoom: relaxing it 1.5× brought back faint contours, and 2.5× posterized the skies the way pngquant's 65–80 setting does.",
      ],
    },
    {
      k: "p",
      s: [
        "It costs bytes. Across the 12 photos our output is 16.5% larger than pngquant's. The 2.5× relaxed target would have made it 5.3% larger; a target about 3× stricter, 21.3%. We chose a sky without stripes.",
      ],
    },
    {
      k: "p",
      s: [
        "It isn't perfect. On a yellow radial gradient in the Tux image, ours still shows one faint lighter ring at 4× zoom (pngquant's shows grain and stronger rings), and that file is 1.57× pngquant's size.",
      ],
    },
    { k: "h2", v: "Measuring quality honestly", id: "measuring-quality" },
    {
      k: "p",
      s: [
        "Any quantizer can win on size: use 16 colours. The real question is size at a given visible quality, which needs a metric that agrees with eyes.",
      ],
    },
    {
      k: "ul",
      items: [
        [
          a("SSIMULACRA2", "https://github.com/cloudinary/ssimulacra2"),
          " (Jon Sneyers, Cloudinary, 2022) is our main metric. Its README calibrates the scale: 70 is “high quality”, 80 is “very high quality” (not noticeable side by side), 85 “excellent”, 90 “visually lossless” in a flicker test. For transparent images we score the composite over a 10% and a 90% grey background and keep the worse score.",
        ],
        [
          strong("PSNR"),
          " we report but don't trust; it's blind to where the error lands. On Kodak image 5, PSNR prefers pngquant (35.98 dB against our 35.58), while SSIMULACRA2 prefers ours (80.98 against 77.20). One known blind spot: dither noise that the eye averages away still counts in full against PSNR.",
        ],
        [
          strong("OKLab ΔE and hue shift"),
          " catch colour drift, which people forgive less than lost detail: mean and 99th-percentile ΔE over visible pixels, and mean hue shift on saturated pixels.",
        ],
      ],
    },
    { k: "h3", v: "Setup" },
    {
      k: "p",
      s: [
        "We used 25 images in three groups. 12 photos come from the public ",
        a("Kodak lossless true colour suite", "https://r0k.us/graphics/kodak/"),
        ". 9 are logos and graphics (Tux, the Python, Firefox and WordPress logos and other public PNGs, plus a drop-shadow card and an alpha gradient we generated); 8 of them have transparency. 4 are screenshots: one public web page, and a light UI, dark code editor and chart we generated.",
      ],
    },
    {
      k: "p",
      s: [
        "The reference is pngquant 3.0.3 with ",
        code("--quality 65-80 --speed 1 --strip"),
        ". Ours ran at quality 85. Both outputs went through the same oxipng level 4 pass (pyoxipng 9.1.1), so bytes compare pixels, not encoders. (The tool itself runs oxipng level 2 in Balanced and Smallest, level 4 in Best: oxipng is lossless, and on this set level 6 spent about 14× the time of level 2 to save 1–3% of bytes.)",
      ],
    },
    {
      k: "table",
      head: [["Group"], ["Bytes vs pngquant"], ["Mean SSIMULACRA2, ours / pngquant"], ["Worst per-image gap"]],
      rows: [
        [["12 photos"], ["+16.5%"], ["84.36 / 75.08"], ["+3.78"]],
        [["9 logos and graphics"], ["+3.4%"], ["85.42 / 77.98"], ["+0.00 (a tie)"]],
        [["4 screenshots"], ["+4.7%"], ["91.25 / 85.81"], ["+3.68"]],
      ],
    },
    {
      k: "p",
      s: [
        "All 25 images scored at least as high as pngquant's; one tied (the PNG transparency demo, 73.23). 99th-percentile colour error was lower on all 25, mean ΔE on 24 (the demo image: 0.0115 against 0.0114). Mean hue shift was lower on 21, tied on 2, and slightly higher on 2 (Kodak 5 by 0.04°, the dice by 0.01°).",
      ],
    },
    { k: "p", s: ["A few individual results show the spread:"] },
    {
      k: "table",
      head: [["Image"], ["Ours"], ["pngquant 65–80"], ["SSIMULACRA2, ours / pngquant"]],
      rows: [
        [["Python logo"], ["13,928 B"], ["28,986 B"], ["84.52 / 82.30"]],
        [["PNG transparency demo"], ["47,930 B"], ["52,676 B"], ["73.23 / 73.23"]],
        [["Kodak 5 (motorbikes)"], ["250,840 B"], ["253,341 B"], ["80.98 / 77.20"]],
        [["Kodak 16 (sky, sea)"], ["201,917 B"], ["118,447 B"], ["87.52 / 71.49"]],
        [["Tux"], ["73,844 B"], ["46,944 B"], ["92.36 / 74.75"]],
      ],
    },
    { k: "h3", v: "Where we lose" },
    {
      k: "ul",
      items: [
        [
          strong("Photo bytes."),
          " Kodak 16 is 1.70× pngquant's size; pngquant's version scores 71.49 and its sky posterizes, ours doesn't. If 71 is good enough for you, pngquant's file is smaller.",
        ],
        [
          strong("Our Smallest mode."),
          " At quality 45, six of the 25 images score below pngquant 65–80. The worst is the light UI screenshot, 4.47 points lower. Photos at that setting are still 6.5% larger than pngquant's. Smallest is a real trade-off, and we label it as one.",
        ],
        [
          strong("Speed."),
          " The median photo takes 292 ms to quantize (Node, our development machine), before oxipng. Fine for a browser tool, slow for a batch pipeline.",
        ],
      ],
    },
    { k: "h2", v: "When PNG is the wrong format", id: "when-not-png" },
    {
      k: "p",
      s: [
        "Even well-quantized, a photo is a poor fit for PNG. On the same 12 photos, we took the smallest encode that matched or beat our PNG's SSIMULACRA2 score. WebP (cwebp ",
        code("-m 6 -sharp_yuv"),
        ") needed 1,558,214 bytes in total, and AVIF (libavif through Pillow, speed 6) needed 1,446,770. Our palette PNGs took 2,710,416, so WebP was 43% smaller and AVIF 47% smaller at equal or better quality.",
      ],
    },
    { k: "p", s: ["The rule of thumb:"] },
    {
      k: "ul",
      items: [
        [
          strong("Photos, or anything with large smooth gradients:"),
          " use WebP or AVIF. Both support alpha, and every current browser decodes them.",
        ],
        [
          strong("Logos, icons, UI screenshots, diagrams:"),
          " lossy PNG is excellent. They have few true colours, and stay crisp where lossy WebP and AVIF can soften text edges.",
        ],
        [
          strong("Pixel-exact assets"),
          " (sprite sheets, images you'll edit again, anything a test compares byte for byte): stay lossless.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Our ",
        a("image compressor", "/tools/image-compressor"),
        " runs this quantizer and oxipng entirely in your browser. When you give it a photographic PNG, it suggests switching to JPEG or WebP. If the re-encoded PNG would come out larger than your original, it keeps the original and says so.",
      ],
    },
  ],
};
