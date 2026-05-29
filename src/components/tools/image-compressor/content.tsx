import { ToolContent } from "@/components/shared/tool-content";

export function ImageCompressorContent() {
  return (
    <ToolContent
      intro="Compress images in the browser with codec-quality output: JPEG, PNG, WebP, and AVIF, all encoded via the original reference encoders compiled to WebAssembly. Side-by-side comparison with a draggable reveal lets you spot quality loss instantly. Colour profile (ICC) preservation is on by default so red doesn't drift into orange after a round-trip."
      useCases={[
        {
          title: "Optimising images for the web",
          description:
            "Drop a screenshot or product photo, get a WebP or AVIF version that's 40-70% smaller with no visible difference. The reveal slider catches any compression artifacts before you ship.",
        },
        {
          title: "Preparing images for email or chat",
          description:
            "Most email services limit attachment size to ~25MB. Drag in a high-res image, dial the quality to fit within the budget, with size visible in real time.",
        },
        {
          title: "Bulk processing a photo set",
          description:
            "Drop multiple images at once — each is processed in its own worker. The job queue shows total saved bytes and lets you re-tune any individual photo.",
        },
        {
          title: "Converting between formats",
          description:
            "JPEG → WebP, PNG → AVIF, etc. The format dropdown handles cross-encoder conversion without intermediate steps. Lossless preserves PNG's exact pixels; lossy explores the quality-vs-size trade-off.",
        },
      ]}
      faqs={[
        {
          question: "Does my image leave the browser?",
          answer:
            "No — everything runs locally via WebAssembly-compiled encoders. No upload, no server, no third-party CDN. Safe for sensitive screenshots, personal photos, and unreleased product assets.",
        },
        {
          question: "Which format should I pick?",
          answer:
            "AVIF for the best size at acceptable quality (modern browsers only). WebP for broad support with good size savings. JPEG for universal compatibility. PNG for screenshots / UI / anything with sharp edges or transparency. Hover over each option for a one-line guide.",
        },
        {
          question: "Why is my AVIF encoded slowly?",
          answer:
            "AVIF's encoder explores a much larger search space than JPEG / WebP to find optimal compression. Expect 5-20× longer encode time. The reward is meaningfully smaller files at the same quality.",
        },
        {
          question: "What does ICC profile preservation do?",
          answer:
            "Images carry colour profile metadata (sRGB, Display P3, Adobe RGB) that tells browsers how to display the pixels. Stripping the profile is a common 'optimization' that silently shifts colours. The compressor preserves the source profile by default.",
        },
        {
          question: "Why is my output sometimes larger than the input?",
          answer:
            "If the input is already aggressively compressed (e.g. a small JPEG from a CDN), re-encoding can't beat it. The 'savings' badge surfaces this explicitly with a `+%` indicator rather than silently shipping a worse file.",
        },
        {
          question: "Can I batch-resize as well as compress?",
          answer:
            "Yes — set a target max dimension in the resize panel. Each image is scaled down before re-encoding. Useful for hero images that need to fit different breakpoints.",
        },
      ]}
      relatedSlugs={[
        "image-format-converter",
        "image-resizer",
        "image-batch-resizer",
        "image-color-extractor",
      ]}
    />
  );
}
