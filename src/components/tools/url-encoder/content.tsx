import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Percent-encode text so it's safe inside a URL, or decode %20-filled strings back into readable text. Component mode encodes a single value (a query parameter or path segment); Full URL mode keeps the delimiters that make an address work. Everything runs in your browser.",
  usesNote: "Make any text safe for a query string.",
  useCases: [
    {
      tag: "?q=",
      tint: "clay",
      title: "Query values",
      description: "Encode search terms, names or JSON that contain spaces, & and = before dropping them into a query string.",
    },
    {
      tag: "%20",
      tint: "teal",
      title: "Read logs",
      description: "Decode the %-escaped URLs that show up in server logs, analytics exports and error reports.",
    },
    {
      tag: "→",
      tint: "sage",
      title: "Redirect params",
      description: "Encode a whole URL in Component mode so it can travel as a single redirect_uri or return_to parameter.",
    },
  ],
  faqs: [
    {
      question: "Component or full URL?",
      answer:
        "Component (the default) encodes everything except letters, digits and - _ . ~ ! ' ( ) *, which is what a single value needs. Full URL keeps : / ? # & = and the other delimiters, so a whole address still works after encoding.",
    },
    {
      question: "Are + signs decoded as spaces?",
      answer:
        "Yes by default, as HTML form encoding expects. If your + signs are literal (in a path, say), turn off “Read + as a space” in the ⋯ menu.",
    },
    {
      question: "Can it encode spaces as + instead of %20?",
      answer:
        "Yes. Turn on “Spaces as +” in the ⋯ menu for application/x-www-form-urlencoded output. There's also a strict RFC 3986 option that escapes ! ' ( ) * as well.",
    },
    {
      question: "What about Unicode?",
      answer:
        "Characters are encoded as their UTF-8 bytes, the web standard, so “café” becomes caf%C3%A9. Decoding reports an error if the escapes don't form valid UTF-8.",
    },
    {
      question: "Why does decoding fail on a stray %?",
      answer:
        "A % must be followed by two hex digits. The error points to where the bad one is; a literal percent sign has to be written as %25.",
    },
    {
      question: "Is my text sent anywhere?",
      answer: "No. Encoding and decoding use the browser's built-in functions on your device; nothing is uploaded.",
    },
  ],
  relatedSlugs: ["url-parser", "html-entity", "base64", "word-counter"],
} as const;

export function UrlEncoderContent() {
  return <ToolContent {...seoData} />;
}
