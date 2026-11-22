import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

export const post: BlogPost = {
  slug: "base64-is-not-encryption",
  title: "Base64 is not encryption: what it's actually for",
  description:
    "Base64 makes bytes safe for text-only channels. It hides nothing. How the encoding works, what it costs, and the bugs it causes when misused.",
  date: "2026-11-21",
  author: "The utilyx team",
  tags: ["Encoding", "Security", "JavaScript"],
  readingTime: "9 min",
  cover: "encoding",
  tool: { name: "Base64 encoder", glyph: "64", tint: "plum", href: "/tools/base64" },
  blocks: [
    {
      k: "p",
      s: [
        "You're reviewing a pull request and a config file contains this line:",
      ],
    },
    { k: "code", lang: "yaml", v: "db_password: cGFzc3dvcmQxMjM=" },
    {
      k: "p",
      s: [
        "The author's note says it's fine because the value is encoded. Run it through any decoder and the argument ends:",
      ],
    },
    { k: "code", lang: "bash", v: "$ echo -n 'cGFzc3dvcmQxMjM=' | base64 -d\npassword123" },
    {
      k: "p",
      s: [
        "Base64 has no key, no secret and no state. Anyone who recognizes the alphabet (and the trailing ",
        code("="),
        " gives it away) can reverse it in one command. That isn't a flaw. Base64 was never meant to hide anything. It solves a different, narrower problem, and most base64 bugs come from forgetting what that problem was.",
      ],
    },
    { k: "h2", v: "What base64 is for", id: "what-base64-is-for" },
    {
      k: "p",
      s: [
        "Lots of channels carry text but not arbitrary bytes. Early email was 7-bit. JSON strings must be valid Unicode. HTTP headers, XML attributes, URLs, environment variables and terminal copy-paste all choke on a null byte or a stray ",
        code("0xFF"),
        ". If you want to send a PNG, a signature or an encryption key through one of those channels, you need a way to spell bytes using only characters that survive the trip.",
      ],
    },
    {
      k: "p",
      s: [
        a("RFC 4648 §4", "https://www.rfc-editor.org/rfc/rfc4648#section-4"),
        " states the goal directly: base64 is ",
        em("designed to represent arbitrary sequences of octets in a form that allows the use of both upper- and lowercase letters but that need not be human readable."),
        " It picks 64 characters that are safe almost everywhere (",
        code("A–Z"),
        ", ",
        code("a–z"),
        ", ",
        code("0–9"),
        ", ",
        code("+"),
        ", ",
        code("/"),
        ") plus ",
        code("="),
        " for padding, and maps every possible byte sequence onto them.",
      ],
    },
    {
      k: "p",
      s: [
        "That's the whole job: ",
        strong("transport safety"),
        ". Confidentiality is a separate property, and base64 doesn't provide it.",
      ],
    },
    { k: "h2", v: "How 3 bytes become 4 characters", id: "how-3-bytes-become-4-characters" },
    {
      k: "p",
      s: [
        "64 is 2⁶, so each base64 character carries exactly 6 bits. Three bytes are 24 bits, which divide evenly into four 6-bit groups. The encoder works through the input three bytes at a time. Here is the text ",
        code("Man"),
        ":",
      ],
    },
    {
      k: "code",
      lang: "text",
      v: "text      M         a         n\nbytes     0x4D      0x61      0x6E\nbits      01001101  01100001  01101110\n\nregroup   010011  010110  000101  101110\nvalue     19      22      5       46\nchar      T       W       F       u",
    },
    {
      k: "p",
      s: [
        "Value 0–25 maps to ",
        code("A–Z"),
        ", 26–51 to ",
        code("a–z"),
        ", 52–61 to ",
        code("0–9"),
        ", then 62 is ",
        code("+"),
        " and 63 is ",
        code("/"),
        ". So 19 is ",
        code("T"),
        ", 22 is ",
        code("W"),
        ", 5 is ",
        code("F"),
        ", 46 is ",
        code("u"),
        ", and ",
        code("Man"),
        " encodes to ",
        code("TWFu"),
        ".",
      ],
    },
    { k: "h3", v: "When the input doesn't divide by three" },
    {
      k: "p",
      s: [
        "If one or two bytes are left over, the encoder pads the bits with zeros to finish the last 6-bit group, then writes ",
        code("="),
        " for each character position that carries no input at all:",
      ],
    },
    {
      k: "code",
      lang: "text",
      v: "\"Ma\"  01001101 01100001 + 00        → 010011 010110 000100     → TWE=\n\"M\"   01001101 + 0000                → 010011 010000            → TQ==",
    },
    {
      k: "p",
      s: [
        "Padding tells the decoder how many bytes the last group really holds, so the output is always a multiple of four characters. ",
        a("RFC 4648 §3.2", "https://www.rfc-editor.org/rfc/rfc4648#section-3.2"),
        " requires it unless the spec using base64 says otherwise. Some do, as we'll see.",
      ],
    },
    { k: "h2", v: "The 33% tax, and what padding costs", id: "the-33-percent-tax" },
    {
      k: "p",
      s: [
        "Four output characters for every three input bytes means the encoded length is ",
        code("4 × ceil(n / 3)"),
        ". For large inputs that's a flat 33.3% overhead; for tiny inputs padding makes it worse. We checked the formula with ",
        code("Buffer.alloc(n).toString(\"base64\").length"),
        " in Node 26:",
      ],
    },
    {
      k: "table",
      head: [["Input bytes"], ["Base64 chars"], ["Overhead"]],
      rows: [
        [["1"], ["4"], ["+300%"]],
        [["3"], ["4"], ["+33%"]],
        [["4"], ["8"], ["+100%"]],
        [["1,000"], ["1,336"], ["+33.6%"]],
        [["1,048,576 (1 MiB)"], ["1,398,104"], ["+33.3%"]],
        [["1 MiB, MIME-wrapped (76 chars + CRLF)"], ["1,434,896"], ["+36.8%"]],
      ],
    },
    {
      k: "p",
      s: [
        "The last row matters for email and some legacy APIs: line breaks add another 2 bytes per 76 characters.",
      ],
    },
    {
      k: "p",
      s: [
        "HTTP compression wins back much of that, because base64 output only uses 64 symbols and compressors exploit the slack. We measured it on the 64,794-byte PNG we use as our default social image: base64 grows it to 86,392 bytes, and gzip at level 9 brings that back to 59,170. That's less than the raw file, but gzipping the raw PNG gives 55,156, so encoding still costs you about 7% on the wire, plus the CPU to encode and decode.",
      ],
    },
    { k: "h2", v: "base64 vs base64url", id: "base64-vs-base64url" },
    {
      k: "p",
      s: [
        "Two of the standard alphabet's characters are special in URLs. ",
        code("+"),
        " means a space in form-encoded query strings, and ",
        code("/"),
        " separates path segments. ",
        a("RFC 4648 §5", "https://www.rfc-editor.org/rfc/rfc4648#section-5"),
        ' defines a "URL and filename safe" alphabet that swaps them for ',
        code("-"),
        " and ",
        code("_"),
        ". Everything else is identical.",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'const bytes = Buffer.from([0xfb, 0xff, 0xbf]);\nbytes.toString("base64");    // "+/+/"\nbytes.toString("base64url"); // "-_-_"',
    },
    {
      k: "p",
      s: [
        "Send standard base64 through a query string and it breaks quietly. The ",
        code("+"),
        " characters turn into spaces, and Node's decoder skips the characters it doesn't recognize instead of throwing:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'const token = new URLSearchParams("token=+/+/").get("token");\n// " / /"\nBuffer.from(token, "base64");\n// <Buffer ff>   (three bytes went in, one came out, no error)',
    },
    {
      k: "p",
      s: [
        "JWTs are the most common base64url you'll meet. ",
        a("RFC 7515", "https://www.rfc-editor.org/rfc/rfc7515#section-2"),
        " (JWS) uses base64url ",
        em("with the padding removed"),
        ", which is why a JWT header such as ",
        code("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"),
        " has no trailing ",
        code("="),
        ". Strict decoders want the padding back. Python's ",
        code("base64.b64decode(\"eyJhIjoxfQ\")"),
        " fails with ",
        code("binascii.Error: Incorrect padding"),
        "; append ",
        code("="),
        " until the length is a multiple of four. We cover reading tokens in ",
        a("How to decode a JWT without pasting it into a stranger's website", "/blog/decode-jwt-safely"),
        ".",
      ],
    },
    { k: "h2", v: "Encoding is not a lock", id: "encoding-is-not-a-lock" },
    {
      k: "p",
      s: [
        "The opening example is the mild version. These are the places where treating base64 as protection causes real exposure.",
      ],
    },
    { k: "h3", v: "Kubernetes Secrets" },
    {
      k: "p",
      s: [
        "The ",
        code("data"),
        " field of a Secret holds base64 values, which makes a manifest look scrambled. It isn't. The ",
        a("Kubernetes documentation", "https://kubernetes.io/docs/concepts/configuration/secret/"),
        " says so up front:",
      ],
    },
    {
      k: "quote",
      s: [
        "Kubernetes Secrets are, by default, stored unencrypted in the API server's underlying data store (etcd). Anyone with API access can retrieve or modify a Secret, and so can anyone with access to etcd.",
      ],
    },
    {
      k: "p",
      s: [
        "The base64 is there so a Secret can hold binary data such as keystores, not to hide it. Committing a Secret manifest to Git is committing the password. Turn on encryption at rest for etcd, keep RBAC on Secrets tight, and keep the real values in a secret manager or encrypt them before they go into the repo.",
      ],
    },
    { k: "h3", v: "Basic auth headers" },
    {
      k: "p",
      s: [
        a("RFC 7617", "https://www.rfc-editor.org/rfc/rfc7617#section-2"),
        " builds the header by joining user ID and password with a colon and base64-encoding the result. Its own example:",
      ],
    },
    {
      k: "code",
      lang: "bash",
      v: "Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==\n\n$ echo -n 'QWxhZGRpbjpvcGVuIHNlc2FtZQ==' | base64 -d\nAladdin:open sesame",
    },
    {
      k: "p",
      s: [
        "The RFC's security considerations open with \"The Basic authentication scheme is not a secure method of user authentication\". Without TLS the password travels in plain text. With TLS it still lands in plain text in any proxy, log line or HAR file that records request headers. Redact the header before you share a log.",
      ],
    },
    { k: "h3", v: "The trailing newline you encoded by accident" },
    {
      k: "p",
      s: [
        "Not a leak, but it costs hours. ",
        code("echo"),
        " appends a newline, and ",
        code("base64"),
        " encodes it:",
      ],
    },
    {
      k: "code",
      lang: "bash",
      v: "$ echo \"hunter2\" | base64\naHVudGVyMgo=\n$ echo -n \"hunter2\" | base64\naHVudGVyMg==",
    },
    {
      k: "p",
      s: [
        "The first value decodes to ",
        code("hunter2\\n"),
        ", and the database rejects it as a wrong password. If a secret works when you type it but not from a Secret, check for that ",
        code("Cg"),
        " or ",
        code("go="),
        " at the end.",
      ],
    },
    { k: "h2", v: "btoa and Unicode", id: "btoa-and-unicode" },
    {
      k: "p",
      s: [
        "The browser's ",
        code("btoa"),
        " predates UTF-8 being universal. It takes a string where each character must be a single byte (Latin-1, code points 0–255). Anything above that throws:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'btoa("café ✓");\n// Node 26:  InvalidCharacterError: Invalid character\n// Chrome:   Failed to execute \'btoa\' on \'Window\': The string to be encoded\n//           contains characters outside of the Latin1 range.',
    },
    {
      k: "p",
      s: [
        "The error is the better outcome. The worse one is input with only Latin-1 accents, because ",
        code("btoa"),
        " accepts it and encodes the wrong bytes:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'btoa("naïve");                            // "bmHvdmU="  (Latin-1 bytes)\nBuffer.from("naïve").toString("base64");  // "bmHDr3Zl"  (UTF-8 bytes)\n\nBuffer.from("bmHvdmU=", "base64").toString(); // "na�ve"',
    },
    {
      k: "p",
      s: [
        "A server that decodes as UTF-8, which is nearly all of them, gets a replacement character. The mirror bug happens on the way back: ",
        code("atob(\"Y2Fmw6kg4pyT\")"),
        " returns ",
        code("cafÃ© â"),
        " followed by two invisible control characters, because ",
        code("atob"),
        " hands you raw bytes dressed up as a string.",
      ],
    },
    {
      k: "p",
      s: [
        "The fix is to be explicit about the step base64 doesn't cover: turning text into bytes. Use ",
        code("TextEncoder"),
        " and ",
        code("TextDecoder"),
        ":",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'function encodeBase64(text) {\n  const bytes = new TextEncoder().encode(text);\n  let binary = "";\n  for (const b of bytes) binary += String.fromCharCode(b);\n  return btoa(binary);\n}\n\nfunction decodeBase64(b64) {\n  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));\n  return new TextDecoder().decode(bytes);\n}\n\nencodeBase64("café ✓");       // "Y2Fmw6kg4pyT"\ndecodeBase64("Y2Fmw6kg4pyT"); // "café ✓"',
    },
    {
      k: "p",
      s: [
        "The loop is deliberate. The popular one-liner ",
        code("String.fromCharCode(...bytes)"),
        " spreads every byte into a function argument and fails on large inputs; on a 1 MiB array Node throws ",
        code("RangeError: Maximum call stack size exceeded"),
        ".",
      ],
    },
    {
      k: "p",
      s: [
        "Newer runtimes ship a direct API, ",
        code("Uint8Array.prototype.toBase64()"),
        " and ",
        code("Uint8Array.fromBase64()"),
        ", with an ",
        code("alphabet: \"base64url\""),
        " option. They work in Node 26, which we used for every example here. Check browser support for your audience before you depend on them in front-end code. In Node, ",
        code("Buffer.from(text).toString(\"base64\")"),
        " has always been UTF-8 by default.",
      ],
    },
    { k: "h2", v: "Line wrapping and lenient decoders", id: "line-wrapping-and-lenient-decoders" },
    {
      k: "p",
      s: [
        a("RFC 4648 §3.1", "https://www.rfc-editor.org/rfc/rfc4648#section-3.1"),
        " says implementations must not add line feeds unless the referring spec asks for them. Two common ones do: MIME limits lines to 76 characters and PEM to 64. Command-line tools often follow them by default, so the same value comes out differently depending on what produced it:",
      ],
    },
    {
      k: "ul",
      items: [
        [code("base64"), " (GNU coreutils and uutils) wraps at 76 columns. Use ", code("base64 -w 0"), " for one line."],
        [code("openssl base64"), " wraps at 64. Use ", code("openssl base64 -A"), "."],
        [
          "Python's ",
          code("base64.encodebytes"),
          " wraps at 76 and adds a trailing ",
          code("\\n"),
          "; ",
          code("b64encode"),
          " doesn't wrap.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Paste a wrapped value into a single-line field such as an environment variable or a YAML scalar, and what happens next depends entirely on the decoder:",
      ],
    },
    {
      k: "table",
      head: [["Decoder"], ["Real newlines (CRLF)"], ["Literal \\n (backslash + n)"]],
      rows: [
        [[code("atob"), " (WHATWG forgiving decode)"], ["Ignored"], [code("InvalidCharacterError")]],
        [[code("Buffer.from(s, \"base64\")")], ["Ignored"], [strong("Silently wrong"), ": 100 bytes in, 101 out"]],
        [[code("base64.b64decode(s)"), " (Python)"], ["Discarded"], [strong("Silently wrong"), ": 101 bytes out"]],
        [[code("b64decode(s, validate=True)")], [code("Only base64 data is allowed")], ["Same error"]],
        [[code("Base64.getDecoder()"), " (Java)"], [code("Illegal base64 character d")], [code("Illegal base64 character 5c")]],
        [[code("Base64.getMimeDecoder()"), " (Java)"], ["Ignored"], ["Silently wrong"]],
      ],
    },
    {
      k: "p",
      s: [
        "The Java message names the offending byte in hex: ",
        code("d"),
        " is a carriage return, ",
        code("5c"),
        " a backslash. The silently wrong rows are the dangerous ones. Lenient decoders drop the backslash but keep the ",
        code("n"),
        ", because ",
        code("n"),
        " is a valid base64 character, and every byte after it shifts. A literal ",
        code("\\n"),
        " from a badly escaped JSON or ",
        code(".env"),
        " file therefore produces bytes that are subtly corrupt with no error at all. When the decoded value is a key or certificate, the failure surfaces much later and far away. Strip whitespace on purpose before decoding, and decode strictly when the input comes from outside.",
      ],
    },
    { k: "h2", v: "Data URIs: when inlining helps and when it hurts", id: "data-uris" },
    {
      k: "p",
      s: [
        "A data URI puts the bytes of a file into the URL itself: ",
        code("data:image/png;base64,iVBORw0KGgo…"),
        ". It saves a request, which is real value for a tiny icon in a stylesheet, a favicon in a single-file HTML report, or an image in an email.",
      ],
    },
    { k: "p", s: ["The costs grow with the file:"] },
    {
      k: "ul",
      items: [
        [
          strong("No separate caching."),
          " The image is re-downloaded every time the HTML or CSS that contains it changes, and can't be shared between pages.",
        ],
        [
          strong("It blocks rendering."),
          " An image inlined in CSS makes the stylesheet bigger, and the browser won't paint until it has the whole stylesheet. A normal image would have loaded in parallel.",
        ],
        [
          strong("The 33% tax, partly recovered."),
          " As measured above, compression gets most of it back but not all.",
        ],
        [strong("No lazy loading or responsive variants"), " through ", code("srcset"), "."],
      ],
    },
    {
      k: "p",
      s: [
        "Our rule of thumb: inline assets of a few kilobytes that every page needs, and serve everything else as a file with a long cache lifetime. Measure with your own pages before you take anyone's threshold as gospel, including ours.",
      ],
    },
    {
      k: "p",
      s: [
        "Base64 earns its place when bytes have to travel through a channel built for text. When someone uses it to hide a value, the value isn't hidden. To protect data, encrypt it with a real key. Then, if the ciphertext has to fit in a text field, base64 is the right way to carry it.",
      ],
    },
    {
      k: "p",
      s: [
        strong("Try it:"),
        " the ",
        a("utilyx Base64 encoder", "/tools/base64"),
        " encodes text as UTF-8, switches between standard, URL-safe, MIME and PEM output, takes files and data URIs, and shows a hex dump of what it decoded. It runs in your browser, so a secret you're checking doesn't go anywhere, though if it's in a config file, it's already less secret than you think.",
      ],
    },
  ],
};
