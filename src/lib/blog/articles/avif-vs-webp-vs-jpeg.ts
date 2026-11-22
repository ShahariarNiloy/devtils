import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

const PICTURE_HTML = `<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Quarterly revenue chart"
       width="1200" height="700" loading="lazy" decoding="async">
</picture>`;

const BUDGET_TRACE = `budget 61440 (60 KB)   AVIF range q26–q80, start q60
  fast probe q60  78495  over
  fast probe q26  20856  fits
  fast probe q52  62371  over
  fast probe q46  49911  fits
  fast probe q51  58759  fits
  full encode q51 62039  (bigger than the probe: ship the probe)
ships q51  58759 bytes

budget 20480 (20 KB)
  fast probe q60  78495  over
  fast probe q26  20856  over   (the floor doesn't fit: stop)
ships q26  20856 bytes, flagged over budget`;

export const post: BlogPost = {
  slug: "avif-vs-webp-vs-jpeg",
  title: "AVIF vs WebP vs JPEG: which is actually smallest? We encoded 34 images",
  description:
    "At equal perceived quality AVIF was smallest on 30 of 34 images, but only 8–17% smaller than JPEG on photos. Our data, its losses, and how to ship it.",
  date: "2026-11-22",
  author: "The utilyx team",
  tags: ["Images", "Performance"],
  readingTime: "9 min",
  cover: "formats",
  tool: { name: "Image compressor", glyph: "avif", tint: "rose", href: "/tools/image-compressor" },
  blocks: [
    {
      k: "p",
      s: [
        "You export the same photo as JPEG, WebP and AVIF, all at quality 60, and AVIF comes out the biggest of the three. Someone on your team concludes the AVIF hype is overblown. Someone else sets everything to quality 75 and reports AVIF is half the size. Both experiments are broken the same way.",
      ],
    },
    {
      k: "p",
      s: [
        "A quality number is not a unit. To compare formats you have to hold the ",
        em("visible"),
        " quality fixed and measure bytes. We did that for 34 images while tuning our image compressor's Auto mode. AVIF won most of them, by a lot less than the marketing suggests on photos, by a lot more on graphics, and it lost four times for a reason you can fix.",
      ],
    },
    { k: "h2", v: "Quality 75 is not a unit", id: "quality-is-not-a-unit" },
    {
      k: "p",
      s: [
        "Each encoder maps its 0–100 slider onto its own internals: MozJPEG scales quantization tables, libwebp and libavif pick quantizers for different transforms. Nothing ties libavif's 60 to MozJPEG's 60. Here is Kodak image 5 (motorbikes, 768×512) at the same number in all three, with encoder settings from our tool:",
      ],
    },
    {
      k: "table",
      head: [["Kodak 5"], ["Bytes at quality 60"], ["SSIMULACRA2"], ["Bytes at SSIMULACRA2 75"]],
      rows: [
        [["JPEG (MozJPEG, 4:2:0)"], ["61,529"], ["64.86"], ["87,836"]],
        [["WebP (libwebp, method 6)"], ["64,670"], ["68.07"], ["82,552"]],
        [["AVIF (libavif, speed 6)"], ["81,737"], ["76.57"], ["77,442"]],
      ],
    },
    {
      k: "p",
      s: [
        "At “quality 60”, AVIF is 33% bigger than JPEG, because it's a far better-looking image. Hold the look constant and the order flips: AVIF is 12% smaller than JPEG, WebP 6%.",
      ],
    },
    {
      k: "p",
      s: [
        "We measure “look” with ",
        a("SSIMULACRA2", "https://github.com/cloudinary/ssimulacra2"),
        ", a perceptual metric whose README calibrates 70 as high quality and 80 as very high (no visible difference side by side). Our ",
        a("lossy PNG post", "/blog/how-lossy-png-compression-works"),
        " explains why we trust it over PSNR. For each image and format we encoded a sweep of 10 quality settings (plus a few lower ones for 8 easy images that beat 75 even at q30), scored every file, and interpolated the bytes needed to hit 75.",
      ],
    },
    {
      k: "p",
      s: [
        "Even calibrated presets drift. Our Balanced mode (JPEG q75 at 4:2:0, WebP q80, AVIF q60) was tuned so the three land near the same score, and on 20 Kodak photos the medians are 71.8, 74.0 and 72.1. The ranges are wider: AVIF q60 scored anywhere from 62.0 to 76.6. Fixed settings are a reasonable default, not a fair benchmark. Our own earlier count at those settings (AVIF smallest on 28 of 34 at speed 6) was answering a slightly different question.",
      ],
    },
    { k: "h2", v: "The benchmark", id: "benchmark" },
    {
      k: "p",
      s: [
        "Encoders are the WebAssembly builds our tool runs in your browser (",
        code("@jsquash/jpeg"),
        " 1.6.0, ",
        code("@jsquash/webp"),
        " 1.5.0, ",
        code("@jsquash/avif"),
        " 2.1.1), driven from Node with the tool's exact options: progressive MozJPEG with trellis, 4:2:0 for photos and 4:4:4 for screenshots; WebP method 6 with ",
        code("sharp_yuv"),
        "; AVIF speed 6, 4:2:0, tune SSIM. Scores come from the ",
        code("ssimulacra2"),
        " Python package (0.3.0); transparent images are composited over 10% and 90% grey and scored on the worse of the two.",
      ],
    },
    {
      k: "p",
      s: [
        "The 34 images: 20 photos from the ",
        a("Kodak suite", "https://r0k.us/graphics/kodak/"),
        " (12 from lossless PNGs, 8 from JPEG files, which is what re-encoding an existing JPEG looks like); 8 logos and graphics with transparency; an opaque 3D render of dice; 4 screenshots (a public web page, plus a light UI, a dark code editor and a chart we generated); and a synthetic smooth colour pattern, 12 MP resized to 1920×1440.",
      ],
    },
    {
      k: "table",
      head: [["At SSIMULACRA2 75"], ["Images"], ["AVIF smallest"], ["AVIF vs JPEG, median"], ["AVIF vs WebP, median"]],
      rows: [
        [["Photos, lossless source"], ["12"], ["9"], ["−7.7%"], ["−4.6%"]],
        [["Photos, JPEG source"], ["8"], ["8"], ["−17.3%"], ["−7.8%"]],
        [["Screenshots"], ["4"], ["3"], ["−80.5%"], ["−43.6%"]],
        [["Graphics with alpha"], ["8"], ["8"], ["no alpha in JPEG"], ["−57.1%"]],
        [["Dice render"], ["1"], ["1"], ["−84.1%"], ["−57.7%"]],
        [["Smooth synthetic pattern"], ["1"], ["1"], ["−69.3%"], ["−62.5%"]],
      ],
    },
    {
      k: "p",
      s: [
        "AVIF was smallest on 30 of 34. The headline is real for flat colour, soft gradients and smooth shading: on the synthetic pattern AVIF needed 31,947 bytes, WebP 85,261 and JPEG 103,919. On natural photos the gap is single digits to the high teens. The 12 lossless-source photos took 852,911 bytes as JPEG, 819,049 as WebP and 796,889 as AVIF: 6.6% saved over JPEG in total. Screenshot medians cover the three where AVIF reached 75 at all.",
      ],
    },
    {
      k: "p",
      s: [
        "The result is stable across the target. At 70 AVIF wins 28 of 34, at 80 it wins 30. (At 70, JPEG takes Kodak 13 outright.)",
      ],
    },
    { k: "h3", v: "Where AVIF lost" },
    {
      k: "ul",
      items: [
        [strong("Kodak 1"), " (stone house, red shutters): WebP 81,936 bytes, AVIF 84,618 (+3.3%)."],
        [strong("Kodak 2"), " (red door, film grain): WebP 58,073, AVIF 61,640 (+6.1%)."],
        [strong("Kodak 13"), " (mountain stream): WebP 110,812, AVIF 110,838. A tie."],
        [
          strong("Dark code screenshot"),
          ": AVIF never reached 75. At q90 it scored 70.67 at 116,405 bytes; lossy WebP needed 92,692.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Three of the four have sharp, saturated colour edges: red shutters on pale stone, a red door, syntax colours on a near-black background. That pointed at ",
        strong("chroma subsampling"),
        ". At 4:2:0 the encoder stores colour at half resolution in both directions and the decoder smears it back up, so a thin red edge bleeds. WebP is 4:2:0 too, but ",
        code("sharp_yuv"),
        " chooses the downsampled colour to minimise error after upsampling. We re-encoded the four losers with AVIF at 4:4:4 (full-resolution colour):",
      ],
    },
    {
      k: "table",
      head: [["Bytes at SSIMULACRA2 75"], ["AVIF 4:2:0"], ["AVIF 4:4:4"], ["WebP"]],
      rows: [
        [["Kodak 1"], ["84,618"], ["77,626"], ["81,936"]],
        [["Kodak 2"], ["61,640"], ["56,645"], ["58,073"]],
        [["Kodak 13"], ["110,838"], ["104,878"], ["110,812"]],
        [["Dark code screenshot"], ["never reaches 75"], ["63,867"], ["92,692"]],
      ],
    },
    {
      k: "p",
      s: [
        "All four flip to AVIF. We haven't run 4:4:4 across the whole set yet, so the tool still ships 4:2:0; treat this as a lead, not a setting change. And note the dark screenshot's real winner: ",
        strong("lossless WebP, 52,024 bytes"),
        ", pixel-exact, smaller than any lossy encode that looked good.",
      ],
    },
    { k: "h2", v: "Encode time: AVIF's real cost", id: "encode-time" },
    {
      k: "p",
      s: [
        "AVIF's bytes cost CPU. libavif's ",
        code("speed"),
        " option (0 slowest to 10 fastest) trades encoder search effort for time. We timed all 34 images at q60, single-threaded WebAssembly in Node 26 on an Intel i7-1355U laptop:",
      ],
    },
    {
      k: "table",
      head: [["AVIF speed"], ["Median per image"], ["Total, 34 images"], ["Median bytes vs speed 4"], ["Worst image"]],
      rows: [
        [["4"], ["4,732 ms"], ["221.4 s"], ["baseline"], ["baseline"]],
        [["6"], ["592 ms"], ["29.7 s"], ["+1.8%"], ["+28%"]],
        [["7"], ["299 ms"], ["16.8 s"], ["−2.2%"], ["+74%"]],
        [["8"], ["172 ms"], ["7.1 s"], ["−1.6%"], ["+184%"]],
      ],
    },
    {
      k: "p",
      s: [
        "Speed 6 is 7.4× less total time than speed 4 for a median +1.8% in bytes, so that's what we ship. These are sizes at one quality setting, not at equal SSIMULACRA2, so speed 7's smaller median doesn't make it better: its worst case is 74% bigger, and speed 8 nearly tripled the dice render. For comparison, on the 26 opaque images MozJPEG's median was 57.5 ms, WebP method 6 took 728.5 ms and AVIF speed 6 560.5 ms. JPEG is an order of magnitude faster than either. WebP at its maximum effort is not cheap.",
      ],
    },
    { k: "h2", v: "Transparency, lossless, and when PNG stays", id: "transparency-and-lossless" },
    {
      k: "p",
      s: [
        "JPEG has no alpha channel. Encode a transparent logo as JPEG and the transparent pixels have to become some colour; our tool composites them over white, and Auto doesn't offer JPEG at all for images with transparency. Both WebP and AVIF carry alpha, and on our 8 transparent graphics AVIF needed a median 57% fewer bytes than WebP at equal quality.",
      ],
    },
    {
      k: "p",
      s: [
        "WebP's other strength is a ",
        strong("lossless mode"),
        " that beats PNG. Against oxipng level 4, lossless WebP was smaller on 12 of the 13 graphics and screenshots, at 35% to 74% of the PNG's size. The exception was our alpha gradient, 2% bigger. On the light UI screenshot it took 16,218 bytes, pixel-exact; our palette PNG from the last post was 16,075 bytes at a SSIMULACRA2 of 92.7, and AVIF reached 75 at 10,221.",
      ],
    },
    {
      k: "p",
      s: [
        "So PNG stays right when something downstream only accepts PNG, or for icons and UI captures where a ",
        a("palette PNG", "/blog/how-lossy-png-compression-works"),
        " already looks lossless at a similar size. One hard limit to know: WebP can't encode an image wider or taller than 16,383 pixels. A long full-page screenshot needs AVIF, JPEG or PNG.",
      ],
    },
    { k: "h2", v: "Colour profiles: don't shift the colours", id: "colour-profiles" },
    {
      k: "p",
      s: [
        "Users forgive a little softness. They don't forgive a red that goes dull. A photo from a recent iPhone or Mac is often in Display P3, a wider gamut than sRGB, and its pixel values only mean the right colours alongside the embedded ICC profile. Strip the profile and browsers treat the numbers as sRGB: saturated colours go dull.",
      ],
    },
    {
      k: "p",
      s: [
        "All three formats can carry ICC profiles, but the WebAssembly codecs drop them. Our tool handles it in two ways:",
      ],
    },
    {
      k: "ul",
      items: [
        [
          strong("Same format in and out:"),
          " we copy the original profile bytes into the output (an APP2 segment in JPEG, an ICCP chunk in WebP, a colr box in AVIF). The pixels aren't touched.",
        ],
        [
          strong("Format change:"),
          " Display P3 pixels are converted to sRGB before encoding, with out-of-gamut colours clamped to the nearest sRGB value. Other profiles, like Adobe RGB, are reported as lost, and Auto prefers any candidate that kept colour correct, even a bigger one.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "The practical rule: if a format comparison sends an Adobe RGB JPEG through a converter that drops the profile, the AVIF may be smaller because it is a different, duller image.",
      ],
    },
    { k: "h2", v: "Hitting a size budget", id: "size-budget" },
    {
      k: "p",
      s: [
        "Often the real constraint is “under 100 KB”, not a quality level. File size rises with quality, but not smoothly or strictly, so you search. Ours (",
        code("searchBudget"),
        " in the tool's source) works on each codec's quality range, from the equivalent of JPEG 30 (below that, photos fall apart) to JPEG 90:",
      ],
    },
    {
      k: "ol",
      items: [
        ["Probe the preset quality. If it fits, probe the top; if that fits too, done."],
        ["If it doesn't fit, probe the floor. If the floor doesn't fit either, stop: it can't be done."],
        [
          "Otherwise narrow the bracket with a secant step on log(size), clamped toward the middle so a lopsided bracket still halves. Up to 5 fast probes (AVIF one speed step faster, WebP method 4, JPEG without multipass trellis).",
        ],
        [
          "Re-encode the best fitting quality at full effort and try one step up. If full effort comes out bigger than the probe, ship the probe's bytes, which were measured to fit.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Here is that flow for AVIF on Kodak 5, with real encodes. We imported ",
        code("searchBudget"),
        " from the tool and copied the few lines of glue around it:",
      ],
    },
    { k: "code", lang: "text", v: BUDGET_TRACE },
    {
      k: "p",
      s: [
        "Two things worth copying. The answer is always an observed encode, never an extrapolation, so a result that fits really fits. And failure is honest: a 20 KB budget gets the smallest file we made, labelled as over budget, rather than a smear below the floor that technically fits. In Auto mode, every format runs this search and the highest-quality one that fits wins.",
      ],
    },
    { k: "h2", v: "Shipping all three with <picture>", id: "picture" },
    {
      k: "p",
      s: [
        "You don't have to pick one format for every visitor. The browser takes the first ",
        code("<source>"),
        " whose ",
        code("type"),
        " it supports and falls back to the ",
        code("<img>"),
        ":",
      ],
    },
    { k: "code", lang: "html", v: PICTURE_HTML },
    {
      k: "p",
      s: [
        "In Chrome 158 this loads ",
        code("hero.avif"),
        "; change the first type to one Chrome doesn't know and it loads ",
        code("hero.webp"),
        " instead. Order matters, best format first. The ",
        code("<img>"),
        " is the element that renders, so ",
        code("alt"),
        ", ",
        code("width"),
        ", ",
        code("height"),
        " and ",
        code("loading"),
        " belong on it, not on the sources. Leave ",
        code("type"),
        " off a source and the browser has to assume it can decode it.",
      ],
    },
    {
      k: "p",
      s: [
        "Do you still need the fallbacks? ",
        a("caniuse", "https://caniuse.com/avif"),
        " currently puts AVIF at 96.7% of global usage: Chrome 85+, Firefox 93+, Edge 121+, Safari 16.4+ (partial in 16.1–16.3). ",
        a("WebP", "https://caniuse.com/webp"),
        " is at 97.3%. The JPEG costs only storage, and it covers the remaining few percent plus anything that reads the ",
        code("<img>"),
        "'s ",
        code("src"),
        " directly.",
      ],
    },
    { k: "h2", v: "Which one to use", id: "which-one" },
    {
      k: "ul",
      items: [
        [
          strong("Photos:"),
          " AVIF, but expect 8–17% savings over a good JPEG at equal quality, not half. Serve it in ",
          code("<picture>"),
          " with a JPEG fallback.",
        ],
        [strong("Graphics, gradients, transparency:"), " AVIF, by a wide margin: a median 57% under lossy WebP on our alpha graphics."],
        [
          strong("Screenshots and UI:"),
          " AVIF usually, often a fraction of WebP. When pixels must be exact, or colour is dense and saturated, lossless WebP: on our dark code editor it beat every lossy encode that looked good.",
        ],
        [strong("Speed or compatibility above all:"), " JPEG. It encodes about 10× faster and opens everywhere."],
        [
          strong("Saturated colour edges:"),
          " if AVIF loses, try 4:4:4 before giving up on it.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Or skip the guesswork per image. Our ",
        a("image compressor", "/tools/image-compressor"),
        "'s Auto mode encodes AVIF, WebP and JPEG in your browser, keeps the smallest one that gets colour right, and keeps your original if nothing beats it. Nothing is uploaded.",
      ],
    },
  ],
};
