import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "Encode and decode Base64 with both the standard and URL-safe alphabets. Handles text, binary files, and image previews — the result of decoding is auto-inspected so you instantly see whether you got back text, an image, or arbitrary bytes. Roundtrip verification confirms encode→decode matches your original input.",
  useCases: [
        {
          title: "Encoding binary for inline embedding",
          description:
            "Convert an image or font to a Base64 data URL for inline use in CSS / HTML. Useful for tiny icons where the request overhead outweighs the size penalty.",
        },
        {
          title: "Inspecting tokens and credentials",
          description:
            "JWT payloads, OAuth basic auth headers, S3 signed-URL fragments — all use Base64. Paste any token-shaped string to see if it's encoded data underneath.",
        },
        {
          title: "Debugging multipart uploads",
          description:
            "When an SDK shows you a Base64 chunk in a log, paste it here to see what's actually being uploaded. The image preview catches accidentally-shipped large blobs.",
        },
        {
          title: "Encoding for URL-safe transport",
          description:
            "Use the URL-safe variant when the encoded value will go into a query parameter or filename. Avoids `/` and `+` which need percent-encoding in URLs.",
        },
      ],
  faqs: [
        {
          question: "What's the difference between standard and URL-safe Base64?",
          answer:
            "Standard uses `+` and `/` as the 62nd and 63rd characters, and `=` for padding. URL-safe replaces `+` with `-` and `/` with `_`, and often drops padding. The data is the same; only the alphabet differs.",
        },
        {
          question: "Does my input leave my browser?",
          answer:
            "No. All encoding, decoding, and file processing happen client-side. Safe to use with API keys, tokens, and confidential blobs.",
        },
        {
          question: "Why does my decoded text look like garbage?",
          answer:
            "Either the encoded data isn't valid Base64, or the original wasn't UTF-8 text. The output panel offers an alternate view for binary data — try the Bytes tab to see the raw decoded bytes.",
        },
        {
          question: "Can I encode a file?",
          answer:
            "Drop a file onto the input pane (or use the file picker) to encode its contents. Works for images, fonts, PDFs, anything. The output is the file's Base64 representation, ready to copy.",
        },
        {
          question: "What's roundtrip verification?",
          answer:
            "After encoding then decoding, the result should match your original input byte-for-byte. The roundtrip indicator flips to ✓ when verified, and to ✗ if the encoder / decoder disagree — usually a sign of invalid input.",
        },
        {
          question: "Why does my Base64 string have trailing `==`?",
          answer:
            "Padding. Base64 encodes 3 bytes into 4 characters. When the input length isn't a multiple of 3, the encoder adds `=` to fill the gap. URL-safe Base64 often omits padding since the length is recoverable.",
        },
      ],
  relatedSlugs: ["jwt-decoder", "json-formatter", "case-converter", "url-encoder"],
} as const;

export function Base64Content() {
  return <ToolContent {...seoData} />;
}
