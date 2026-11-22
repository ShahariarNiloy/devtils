import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Make the tiny preview that shows while an image loads: a Base64 blurDataURL for next/image, a ThumbHash or BlurHash string for your database, CSS gradients or an inline SVG that need no JavaScript, or just the average colour. Drop, paste or choose an image, or a whole folder in batch mode, and copy ready-to-paste code for Next.js, React or plain HTML. The image is decoded and processed in this tab; nothing is uploaded.",
  usesTitle: "Which one should I use?",
  usesNote: "Pick by where the image comes from.",
  useCases: [
    {
      tag: "next/image",
      tint: "clay",
      title: "Remote images in Next.js",
      description:
        "Next.js makes blurDataURL for you only for static imports. For images from a CMS or a CDN, paste the Base64 here.",
    },
    {
      tag: "database",
      tint: "sage",
      title: "Store it with the record",
      description: "ThumbHash or BlurHash fit in a short text column next to width and height. Decode on the client.",
    },
    {
      tag: "no-js",
      tint: "rose",
      title: "Static sites and emails",
      description: "CSS gradients or inline SVG paint with the HTML, before any script runs.",
    },
    {
      tag: "build",
      tint: "teal",
      title: "A whole folder at once",
      description: "Batch mode gives you one JSON file keyed by filename, ready to import at build time.",
    },
  ],
  faqs: [
    {
      question: "Is my image uploaded?",
      answer:
        "No. The image is drawn onto a canvas in this tab and every format is worked out there, so there's no file size limit and nothing to wait for.",
    },
    {
      question: "What size should the placeholder be?",
      answer:
        "4 pixels wide (the default) keeps a photo's data URL around 160 characters. 8 pixels looks a little closer to the photo for roughly 280. Past 16 it mostly adds bytes to every page that shows the image, since it is blurred anyway.",
    },
    {
      question: "BlurHash or ThumbHash?",
      answer:
        "ThumbHash keeps more detail, the aspect ratio and transparency in about the same number of characters. BlurHash has more ready-made libraries. Both need a small decoder on the page.",
    },
    {
      question: "Why bump the saturation?",
      answer:
        "Blurring averages colours together and makes them look grey. A little extra saturation (1.2×) keeps the placeholder close to how the photo feels.",
    },
    {
      question: "Is it the same output as the npm packages?",
      answer:
        "For the hashes, yes: ThumbHash and BlurHash are worked out by exact ports of the thumbhash and blurhash packages, so the same pixels give the same string. The adjustments mean the same as sharp's modulate(). The Base64 image is encoded in your browser, so its bytes can differ from what sharp would write, but the pixels are the ones shown.",
    },
  ],
  relatedSlugs: ["image-compressor", "color-converter", "base64", "open-graph-generator"],
} as const;

export function BlurPlaceholderContent() {
  return <ToolContent {...seoData} />;
}
