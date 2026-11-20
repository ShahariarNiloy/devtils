import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "Compress images in the browser with codec-quality output: JPEG, PNG, WebP, and AVIF, all encoded via the original reference encoders compiled to WebAssembly. Side-by-side comparison with a draggable reveal lets you spot quality loss instantly. Colour profile (ICC) preservation is on by default so red doesn't drift into orange after a round-trip.",
  usesNote: "Smaller images, same pixels on your device.",
  useCases: [
        {
          title: "Optimising images for the web",
          description:
            "Drop a screenshot or product photo, get a WebP or AVIF version that's 40-70% smaller with no visible difference. The reveal slider catches any compression artifacts before you ship.",
        },
        {
          title: "Preparing images for email or chat",
          description:
            "Most email services limit attachment size to ~25MB. Drag in a high-res image and drag the quality slider down — the new size appears as soon as you let go.",
        },
        {
          title: "Bulk processing a photo set",
          description:
            "Drop multiple images at once — each is processed in its own worker. The job queue shows total saved bytes and lets you re-tune any individual photo.",
        },
        {
          title: "Converting between formats",
          description:
            "JPEG → WebP, PNG → AVIF, etc. Pick the output format in the toolbar and every image is re-encoded without intermediate steps. Auto keeps each image's own format; lossless PNG preserves its exact pixels.",
        },
      ],
  faqs: [
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
          question: "What does Auto quality do?",
          answer:
            "Instead of a fixed number, Auto searches for the lowest encoder quality whose result still measures as visually identical to the original (an SSIM check). If no quality meets that bar, the image is returned unchanged and you're told why. Drag the slider to pick a fixed quality instead — 70–80 is usually indistinguishable from the original.",
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
            "Yes — turn on Max 1920px wide in the toolbar. Wider images are scaled down to 1920px (keeping their aspect ratio) before re-encoding; images that are already narrower keep their size, never upscaled.",
        },
      ],
  relatedSlugs: [
        "image-format-converter",
        "image-resizer",
        "image-batch-resizer",
        "image-color-extractor",
      ],
} as const;

export function ImageCompressorContent() {
  return <ToolContent {...seoData} />;
}
