/**
 * Published blog posts. Copy is verbatim from the v2 blog design (BlogPage
 * canvas); see the blog build notes in the PR for the few factual fixes.
 * The privacy-test post in the design is an unpublished draft with
 * placeholder results and is deliberately NOT included here.
 *
 * Pure data — no React. Rendered by `components/blog/post-body.tsx`.
 */
import { DISTINCT_LIVE_TOOL_COUNT } from "@/lib/implemented-tools";
import type { Block, BlogPost, PlannedPost, Span } from "./types";
import { post as avifPost } from "./articles/avif-vs-webp-vs-jpeg";
import { post as base64Post } from "./articles/base64-is-not-encryption";
import { post as blurPost } from "./articles/blur-placeholders-measured";
import { post as keysPost } from "./articles/react-codemirror-dropped-keystrokes";
import { post as bigJsonPost } from "./articles/format-50mb-json-in-browser";
import { post as pngPost } from "./articles/how-lossy-png-compression-works";
import { post as hreflangPost } from "./articles/hreflang-mistakes";
import { post as timestampsPost } from "./articles/unix-timestamps-time-zones";
import { post as urlPost } from "./articles/url-encoding-explained";
import { post as uuidPost } from "./articles/uuid-v4-v7-ulid";
import { post as curlPost } from "./articles/curl-to-code-gotchas";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string, bold = false): Span => (bold ? { t: "code", v, bold } : { t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

const AUTHOR = "The utilyx team";
const PUBLISHED = "2026-11-21";

const JWT_BLOCKS: Block[] = [
  {
    k: "p",
    s: [
      "You're debugging a login bug. The API returns ",
      code("401"),
      ", and you have a token in your clipboard that starts with ",
      code("eyJ"),
      '. You search for "decode jwt", click the first result, and paste.',
    ],
  },
  {
    k: "p",
    s: [
      "That token might still be valid. Depending on the site, you may have just sent a working credential for your production system to a server you know nothing about.",
    ],
  },
  {
    k: "p",
    s: [
      "The good news: you never need to send a JWT anywhere to read it. Decoding one is a few lines of code. Here's how it works, and how to do it safely.",
    ],
  },
  { k: "h2", v: "What's actually inside a JWT", id: "what-s-actually-inside-a-jwt" },
  { k: "p", s: ["A JSON Web Token is three pieces joined by dots:"] },
  {
    k: "code",
    lang: "text",
    v: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6IkFkYSIsImV4cCI6MTc5NTE5NjM4NH0.4pcPyMD09olPSyXnrXCjTwXyr4BsezdI1AVTmud2fU4",
  },
  { k: "p", s: ["Split on the dots, it's:"] },
  {
    k: "code",
    lang: "text",
    v: "header     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\npayload    eyJzdWIiOiIxMjM0IiwibmFtZSI6IkFkYSIsImV4cCI6MTc5NTE5NjM4NH0\nsignature  4pcPyMD09olPSyXnrXCjTwXyr4BsezdI1AVTmud2fU4",
  },
  {
    k: "ul",
    items: [
      [strong("Header"), ": which algorithm signed the token, such as ", code("HS256"), " or ", code("RS256"), "."],
      [strong("Payload"), ": the claims: who the user is, when the token expires, and anything else the issuer added."],
      [strong("Signature"), ": proof that the header and payload haven't been changed."],
    ],
  },
  {
    k: "p",
    s: [
      "The header and payload are ",
      strong("Base64URL-encoded JSON"),
      ". They are encoded, not encrypted. Anyone who has the token can read them. Only the signature needs a key, and you don't need the signature to read the token.",
    ],
  },
  {
    k: "quote",
    s: [
      strong("The important part:"),
      " decoding a JWT needs no secret. If a tool asks for your signing key just to ",
      em("show"),
      " you the payload, close the tab.",
    ],
  },
  { k: "h2", v: "Decode it in your browser console", id: "decode-it-in-your-browser-console" },
  { k: "p", s: ["Open DevTools on any page (or ", code("about:blank"), ") and paste:"] },
  {
    k: "code",
    lang: "js",
    v: 'function decodeJwt(token) {\n  const [header, payload] = token.split(".").slice(0, 2).map((part) => {\n    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");\n    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));\n    return JSON.parse(new TextDecoder().decode(bytes));\n  });\n  return { header, payload };\n}\n\ndecodeJwt("eyJhbGciOi...");',
  },
  { k: "p", s: ["Two details make this correct instead of almost correct:"] },
  {
    k: "ol",
    items: [
      [
        strong("Base64URL is not Base64."),
        " JWTs use ",
        code("-"),
        " and ",
        code("_"),
        " instead of ",
        code("+"),
        " and ",
        code("/"),
        ", and they drop the ",
        code("="),
        " padding. The ",
        code("replace"),
        " calls put the standard characters back. Browsers' ",
        code("atob"),
        " accepts the missing padding.",
      ],
      [
        strong("Payloads can contain non-ASCII text"),
        ", like a user's name in Bengali or Japanese. ",
        code("atob"),
        " alone returns raw bytes as a string and will mangle it. ",
        code("TextDecoder"),
        " reads it as UTF-8.",
      ],
    ],
  },
  { k: "h2", v: "Decode it in Node.js", id: "decode-it-in-node-js" },
  { k: "p", s: ["Node has Base64URL built in:"] },
  {
    k: "code",
    lang: "js",
    v: 'const [header, payload] = token\n  .split(".")\n  .slice(0, 2)\n  .map((part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8")));',
  },
  { k: "h2", v: "Decode it in the terminal", id: "decode-it-in-the-terminal" },
  { k: "p", s: ["With ", code("jq"), " installed:"] },
  {
    k: "code",
    lang: "bash",
    v: 'jq -R \'split(".") | .[0:2] | map(gsub("-";"+") | gsub("_";"/") | @base64d | fromjson)\' <<< "$TOKEN"',
  },
  {
    k: "p",
    s: [
      "The two ",
      code("gsub"),
      " calls do the same Base64URL-to-Base64 swap as the browser version. Tested with jq 1.7.",
    ],
  },
  { k: "h2", v: "Reading the claims", id: "reading-the-claims" },
  { k: "p", s: ["Most payloads use a handful of registered claims:"] },
  {
    k: "table",
    head: [["Claim"], ["Meaning"], ["Watch out for"]],
    rows: [
      [[code("sub")], ["Subject: usually the user ID"], ["—"]],
      [[code("iss")], ["Issuer: who created the token"], ["Check it matches your auth server"]],
      [[code("aud")], ["Audience: who the token is for"], ["A token for one API shouldn't work on another"]],
      [[code("exp")], ["Expiry time"], [strong("Seconds"), " since 1970, not milliseconds"]],
      [[code("iat")], ["Issued at"], ["Also seconds"]],
      [[code("nbf")], ["Not valid before"], ["Clock drift between servers can trip this"]],
    ],
  },
  {
    k: "p",
    s: [
      "The seconds-versus-milliseconds trap catches everyone once. ",
      code("Date.now()"),
      " in JavaScript returns milliseconds, so compare like this:",
    ],
  },
  { k: "code", lang: "js", v: "const isExpired = payload.exp * 1000 < Date.now();" },
  { k: "p", s: ['If your token "expires immediately" or "never expires", this is the first thing to check.'] },
  { k: "h2", v: "Decoding is not verifying", id: "decoding-is-not-verifying" },
  {
    k: "p",
    s: [
      "Reading a token tells you what it ",
      em("claims"),
      ". It doesn't tell you the claims are true. Anyone can write a payload that says ",
      code('"role": "admin"'),
      ", encode it, and attach a junk signature.",
    ],
  },
  {
    k: "p",
    s: [
      "Your server must ",
      strong("verify the signature"),
      " with the right key before it trusts anything in the payload. Use a maintained library for this, not a hand-written check, and be strict about it:",
    ],
  },
  {
    k: "ul",
    items: [
      [
        strong("Pin the algorithm."),
        " Tell the library which algorithm you expect, such as ",
        code("RS256"),
        ". Never let the token's own header choose.",
      ],
      [
        strong("Reject "),
        code('alg: "none"', true),
        strong("."),
        " Unsigned tokens are a classic attack. Good libraries refuse them by default, but check.",
      ],
      [
        strong("Check "),
        code("exp", true),
        strong(", "),
        code("nbf", true),
        strong(", "),
        code("iss", true),
        strong(" and "),
        code("aud", true),
        ", not just the signature.",
      ],
    ],
  },
  {
    k: "p",
    s: [
      "Decoding is for debugging and for showing information in a UI. Verifying is for deciding whether to trust a request.",
    ],
  },
  { k: "h2", v: "Why pasting tokens into websites is risky", id: "why-pasting-tokens-into-websites-is-risky" },
  {
    k: "p",
    s: [
      "A JWT is usually a ",
      strong("bearer token"),
      ": whoever holds it can use it until it expires. Access tokens often live for 15 minutes to an hour; refresh tokens can last days or weeks.",
    ],
  },
  { k: "p", s: ["When you paste a token into an online decoder, one of two things happens:"] },
  {
    k: "ul",
    items: [
      [strong("The site decodes it in your browser."), " Nothing leaves your machine. This is fine."],
      [
        strong("The site sends it to its server."),
        " Now a live credential sits in someone else's request logs, analytics, or error tracker.",
      ],
    ],
  },
  { k: "p", s: ["You usually can't tell which from the page itself. You ", em("can"), " check:"] },
  {
    k: "ol",
    items: [
      ["Open DevTools and go to the ", strong("Network"), " tab."],
      ["Clear it, then paste your token."],
      ["If a new request appears that carries your input, the tool is uploading it."],
    ],
  },
  {
    k: "p",
    s: [
      "utilyx's ",
      a("JWT decoder", "/tools/jwt-decoder"),
      " runs entirely in your browser. You don't have to take our word for it: run the Network-tab test above, or load the page, switch your connection off, and decode a token offline.",
    ],
  },
  { k: "h2", v: "A safe debugging routine", id: "a-safe-debugging-routine" },
  {
    k: "ul",
    items: [
      [
        strong("Prefer expired or test tokens"),
        " when you share a decoded token with teammates or paste it into a bug report.",
      ],
      [
        strong("Redact before sharing."),
        " Remove the signature (the part after the second dot) and any personal data from the payload.",
      ],
      [strong("Never put tokens in URLs"), " you share. They end up in browser history and server logs."],
      [
        strong("Rotate if in doubt."),
        " If a production token was pasted somewhere it shouldn't have been, revoke the session.",
      ],
    ],
  },
  { k: "h2", v: "Quick reference", id: "quick-reference" },
  {
    k: "ul",
    items: [
      ["A JWT is ", code("header.payload.signature"), ". The first two parts are Base64URL-encoded JSON."],
      ["Decoding needs no key. Verifying does."],
      [code("exp"), ", ", code("iat"), " and ", code("nbf"), " are in seconds."],
      ["Treat any live token like a password."],
    ],
  },
  {
    k: "p",
    s: [
      strong("Try it:"),
      " paste a token into the ",
      a("utilyx JWT decoder", "/tools/jwt-decoder"),
      " to see its header, payload, and exactly when it expires, without it leaving your browser.",
    ],
  },
];

const JSON_BLOCKS: Block[] = [
  {
    k: "p",
    s: [
      "JSON looks like JavaScript, so it's easy to write JavaScript and call it JSON. Then ",
      code("JSON.parse"),
      " throws something unhelpful like:",
    ],
  },
  {
    k: "code",
    lang: "text",
    v: "SyntaxError: Expected double-quoted property name in JSON at position 8 (line 1 column 9)",
  },
  {
    k: "p",
    s: [
      "JSON is deliberately strict. The whole format fits on a business card, and anything outside that card is an error. Below are the eight mistakes behind almost every parse failure, with the exact message Node.js 22 (V8) prints for each. Chrome uses the same engine, so its messages match. Firefox and Safari word them differently, but the cause is the same.",
    ],
  },
  {
    k: "quote",
    s: [
      strong("Tip:"),
      " most messages include a ",
      strong("position"),
      " or ",
      strong("line and column"),
      ". Jump straight there. The real mistake is usually at that spot or one character before it.",
    ],
  },
  { k: "h2", v: "1. Trailing commas", id: "1-trailing-commas" },
  { k: "code", lang: "json", v: '{ "name": "utilyx", "tools": 43, }' },
  { k: "code", lang: "text", v: "Expected double-quoted property name in JSON at position 33 (line 1 column 34)" },
  {
    k: "p",
    s: [
      "JavaScript allows a comma after the last item. JSON doesn't. The parser sees the comma, expects another ",
      code('"key"'),
      ", and finds ",
      code("}"),
      " instead.",
    ],
  },
  {
    k: "p",
    s: [
      strong("Fix:"),
      " delete the comma before ",
      code("}"),
      " or ",
      code("]"),
      ". This is the most common error by far, especially in hand-edited config files.",
    ],
  },
  { k: "h2", v: "2. Single quotes", id: "2-single-quotes" },
  { k: "code", lang: "json", v: "{ 'name': 'utilyx' }" },
  { k: "code", lang: "text", v: "Expected property name or '}' in JSON at position 2 (line 1 column 3)" },
  { k: "p", s: ["JSON strings use ", strong("double quotes only"), ", for keys and values alike."] },
  {
    k: "p",
    s: [
      strong("Fix:"),
      " swap ",
      code("'"),
      " for ",
      code('"'),
      ". Be careful with apostrophes inside text, like ",
      code('"it\'s"'),
      ": those stay as they are.",
    ],
  },
  { k: "h2", v: "3. Unquoted keys", id: "3-unquoted-keys" },
  { k: "code", lang: "json", v: '{ name: "utilyx" }' },
  { k: "code", lang: "text", v: "Expected property name or '}' in JSON at position 2 (line 1 column 3)" },
  {
    k: "p",
    s: [
      "Same message as single quotes, because the parser is asking the same question: where's the double-quoted key? Every key must be a string in double quotes, even simple ones.",
    ],
  },
  { k: "p", s: [strong("Fix:"), " wrap each key in ", code('"…"'), "."] },
  { k: "h2", v: "4. Comments", id: "4-comments" },
  { k: "code", lang: "json", v: '{\n  "port": 3000 // dev only\n}' },
  { k: "code", lang: "text", v: "Expected ',' or '}' after property value in JSON at position 17 (line 2 column 16)" },
  { k: "p", s: ["JSON has no comments. Not ", code("//"), ", not ", code("/* */"), ", not ", code("#"), "."] },
  {
    k: "p",
    s: [
      strong("Fix:"),
      " remove the comments. If you need them in a config file, you probably want a format that supports them: JSONC (used by VS Code's ",
      code("settings.json"),
      " and ",
      code("tsconfig.json"),
      "), JSON5, or YAML. Keep in mind that a file with comments parses fine in the tool that expects JSONC and fails everywhere else.",
    ],
  },
  { k: "h2", v: "5. NaN, Infinity and undefined", id: "5-nan-infinity-and-undefined" },
  { k: "code", lang: "json", v: '{ "ratio": NaN, "limit": Infinity, "value": undefined }' },
  { k: "code", lang: "text", v: 'Unexpected token \'N\', ..." "ratio": NaN, "limi"... is not valid JSON' },
  {
    k: "p",
    s: [
      "These are JavaScript values, not JSON values. JSON only knows strings, numbers, ",
      code("true"),
      ", ",
      code("false"),
      ", ",
      code("null"),
      ", objects and arrays.",
    ],
  },
  {
    k: "p",
    s: [
      "This often comes from code, not typing. ",
      code("JSON.stringify"),
      " quietly turns ",
      code("NaN"),
      " and ",
      code("Infinity"),
      " into ",
      code("null"),
      " and ",
      strong("drops"),
      " keys whose value is ",
      code("undefined"),
      ". But a template, a logger or a Python script (",
      code("json.dumps"),
      " writes ",
      code("NaN"),
      " by default) can still produce invalid output.",
    ],
  },
  {
    k: "p",
    s: [
      strong("Fix:"),
      " use ",
      code("null"),
      ", or represent the special value as a string like ",
      code('"Infinity"'),
      " that your code understands. In Python, pass ",
      code("allow_nan=False"),
      " to catch it early.",
    ],
  },
  { k: "h2", v: "6. Numbers JSON doesn't allow", id: "6-numbers-json-doesn-t-allow" },
  { k: "code", lang: "json", v: '{ "id": 007, "mask": 0x1F, "delta": +1, "half": .5 }' },
  { k: "code", lang: "text", v: "Unexpected number in JSON at position 9 (line 1 column 10)" },
  { k: "p", s: ["JSON numbers are plain decimals. These are all invalid:"] },
  {
    k: "ul",
    items: [
      [
        strong("Leading zeros"),
        ": ",
        code("007"),
        ". Use ",
        code("7"),
        ", or ",
        code('"007"'),
        " if the zeros matter (like a postcode).",
      ],
      [strong("Hex"), ": ", code("0x1F"), ". Use ", code("31"), "."],
      [strong("A leading "), code("+", true), ": ", code("+1"), ". Use ", code("1"), "."],
      [strong("A bare decimal point"), ": ", code(".5"), ". Use ", code("0.5"), "."],
    ],
  },
  {
    k: "p",
    s: [strong("Fix:"), " write the plain decimal, or store the value as a string if its exact formatting matters."],
  },
  { k: "h2", v: "7. Raw line breaks and tabs inside strings", id: "7-raw-line-breaks-and-tabs-inside-strings" },
  { k: "code", lang: "json", v: '{ "message": "line one\nline two" }' },
  { k: "code", lang: "text", v: "Bad control character in string literal in JSON at position 22 (line 1 column 23)" },
  { k: "p", s: ["A JSON string can't contain an actual line break or tab character. It has to be escaped."] },
  {
    k: "p",
    s: [
      strong("Fix:"),
      " use ",
      code("\\n"),
      " for a new line and ",
      code("\\t"),
      " for a tab. If you're building JSON by gluing strings together, stop: build an object and call ",
      code("JSON.stringify"),
      ", which escapes everything correctly.",
    ],
  },
  { k: "h2", v: "8. A hidden character at the start", id: "8-a-hidden-character-at-the-start" },
  { k: "code", lang: "text", v: 'Unexpected token \'\uFEFF\', "\uFEFF{"a":1}" is not valid JSON' },
  {
    k: "p",
    s: [
      "The JSON looks perfect, yet the error points at position 0 and shows a \"token\" you can't see. That's a ",
      strong("byte order mark (BOM)"),
      ", an invisible character some editors (notably on Windows) add to the start of a file. Zero-width spaces pasted from chat apps and web pages cause the same thing.",
    ],
  },
  {
    k: "p",
    s: [strong("Fix:"), ' save the file as "UTF-8" rather than "UTF-8 with BOM". In code, strip it before parsing:'],
  },
  { k: "code", lang: "js", v: 'JSON.parse(text.replace(/^\\uFEFF/, ""));' },
  { k: "h2", v: "Two traps that don't throw", id: "two-traps-that-don-t-throw" },
  { k: "p", s: ["Some JSON parses without errors and is still wrong."] },
  {
    k: "p",
    s: [
      strong("Big integers lose precision."),
      " JavaScript numbers are 64-bit floats, so integers above ",
      code("2^53"),
      " (9,007,199,254,740,992) get rounded:",
    ],
  },
  {
    k: "code",
    lang: "js",
    v: "JSON.parse('{\"id\": 9007199254740993}').id;\n// 9007199254740992 (silently off by one)",
  },
  {
    k: "p",
    s: [
      "This bites with database IDs, Twitter/X IDs and Discord snowflakes. ",
      strong("Fix:"),
      " send large IDs as strings. That's why many APIs return both ",
      code("id"),
      " and ",
      code("id_str"),
      ".",
    ],
  },
  { k: "p", s: [strong("Duplicate keys are accepted, and the last one wins:")] },
  { k: "code", lang: "js", v: 'JSON.parse(\'{"role": "user", "role": "admin"}\').role; // "admin"' },
  { k: "p", s: ["Other parsers may keep the first value or throw. Don't rely on either behaviour; fix the source."] },
  { k: "h2", v: "A faster way to find the problem", id: "a-faster-way-to-find-the-problem" },
  {
    k: "p",
    s: ["Reading error positions by hand works, but it's slow in a 2,000-line payload. A good formatter will:"],
  },
  {
    k: "ul",
    items: [
      ["point at the exact line and column,"],
      ["explain the error in plain words,"],
      [
        "and offer to repair the common cases above (trailing commas, single quotes, unquoted keys, comments) in one click.",
      ],
    ],
  },
  {
    k: "p",
    s: [
      "The ",
      a("utilyx JSON formatter", "/tools/json-formatter"),
      " does all three, and it runs in your browser. That matters when the JSON you're debugging is an API response full of customer data or tokens.",
    ],
  },
  { k: "h2", v: "Quick reference", id: "quick-reference" },
  {
    k: "table",
    head: [["Error message (V8)"], ["Likely cause"]],
    rows: [
      [[code("Expected double-quoted property name")], ["Trailing comma before ", code("}")]],
      [[code("Expected property name or '}'")], ["Single quotes or unquoted keys"]],
      [[code("Expected ',' or '}' after property value")], ["Comment, missing comma, or hex number"]],
      [
        [code("Unexpected token 'N'"), " / ", code("'u'"), " / ", code("'I'")],
        [code("NaN"), ", ", code("undefined"), ", ", code("Infinity")],
      ],
      [[code("Unexpected number")], ["Leading zero"]],
      [[code("Bad control character in string literal")], ["Raw line break or tab in a string"]],
      [[code("Unexpected token"), " at position 0"], ["BOM or invisible character"]],
    ],
  },
];

const CRON_BLOCKS: Block[] = [
  {
    k: "p",
    s: [
      "Cron expressions are five tiny fields that decide when your backups run, your reports send, and your caches clear. They're easy to write and easy to get subtly wrong: a job that runs every minute of the hour instead of once, or at 9am UTC instead of 9am for your users.",
    ],
  },
  {
    k: "p",
    s: [
      "This guide covers how the fields work, the characters that cause most mistakes, and 20 schedules you can copy.",
    ],
  },
  { k: "h2", v: "The five fields", id: "the-five-fields" },
  {
    k: "code",
    lang: "text",
    v: "┌───────────── minute        (0–59)\n│ ┌─────────── hour          (0–23)\n│ │ ┌───────── day of month  (1–31)\n│ │ │ ┌─────── month         (1–12)\n│ │ │ │ ┌───── day of week   (0–6, Sunday = 0; many systems also accept 7)\n│ │ │ │ │\n* * * * *",
  },
  {
    k: "p",
    s: [
      "A job runs when ",
      strong("every"),
      " field matches the current time, with one important exception for the two day fields, covered below.",
    ],
  },
  { k: "h2", v: "The special characters", id: "the-special-characters" },
  {
    k: "table",
    head: [["Character"], ["Meaning"], ["Example"], ["Reads as"]],
    rows: [
      [[code("*")], ["Every value"], [code("* * * * *")], ["Every minute"]],
      [[code(",")], ["A list"], [code("0 9,17 * * *")], ["At 09:00 and 17:00"]],
      [[code("-")], ["A range"], [code("0 9 * * 1-5")], ["09:00, Monday to Friday"]],
      [[code("/")], ["A step"], [code("*/15 * * * *")], ["Every 15 minutes"]],
    ],
  },
  {
    k: "p",
    s: [
      "You can combine them: ",
      code("0 9-17/2 * * 1-5"),
      " means every two hours from 09:00 to 17:00 on weekdays (9, 11, 13, 15, 17).",
    ],
  },
  {
    k: "p",
    s: [
      "Most cron implementations also accept names for months and weekdays, such as ",
      code("JAN"),
      " or ",
      code("MON"),
      ". Numbers work everywhere, so they're the safer choice.",
    ],
  },
  { k: "h2", v: "20 schedules to copy", id: "20-schedules-to-copy" },
  { k: "h3", v: "Every few minutes or hours" },
  {
    k: "table",
    head: [["Schedule"], ["Expression"]],
    rows: [
      [["Every 5 minutes"], [code("*/5 * * * *")]],
      [["Every 15 minutes"], [code("*/15 * * * *")]],
      [["Every hour, on the hour"], [code("0 * * * *")]],
      [["Every 2 hours"], [code("0 */2 * * *")]],
      [["Every 30 minutes during working hours, weekdays"], [code("*/30 9-17 * * 1-5")]],
      [["Every hour from 09:00 to 17:00, weekdays"], [code("0 9-17 * * 1-5")]],
    ],
  },
  { k: "h3", v: "Daily" },
  {
    k: "table",
    head: [["Schedule"], ["Expression"]],
    rows: [
      [["Every day at midnight"], [code("0 0 * * *")]],
      [["Every day at 02:30"], [code("30 2 * * *")]],
      [["Twice a day, 00:00 and 12:00"], [code("0 0,12 * * *")]],
      [["Every weekday at 09:00"], [code("0 9 * * 1-5")]],
      [["Every weekday at 22:00"], [code("0 22 * * 1-5")]],
      [["Weekends at 03:00"], [code("0 3 * * 0,6")]],
    ],
  },
  { k: "h3", v: "Weekly" },
  {
    k: "table",
    head: [["Schedule"], ["Expression"]],
    rows: [
      [["Every Monday at 09:00"], [code("0 9 * * 1")]],
      [["Every Friday at 18:00"], [code("0 18 * * 5")]],
      [["Every Sunday at midnight"], [code("0 0 * * 0")]],
    ],
  },
  { k: "h3", v: "Monthly and yearly" },
  {
    k: "table",
    head: [["Schedule"], ["Expression"]],
    rows: [
      [["First day of every month at midnight"], [code("0 0 1 * *")]],
      [["15th of every month at 09:00"], [code("0 9 15 * *")]],
      [["First day of every quarter"], [code("0 0 1 1,4,7,10 *")]],
      [["Every 1 January at midnight"], [code("0 0 1 1 *")]],
      [["Last day of the month (see below)"], [code("0 0 28-31 * *"), " + a check"]],
    ],
  },
  { k: "h2", v: "Five gotchas that cause most cron bugs", id: "five-gotchas-that-cause-most-cron-bugs" },
  { k: "h3", v: "1. * in the minute field means every minute" },
  { k: "code", lang: "text", v: "* 9 * * *" },
  {
    k: "p",
    s: [
      "This doesn't run at 9am. It runs ",
      strong("60 times"),
      ", every minute from 09:00 to 09:59. If you want once, set the minute: ",
      code("0 9 * * *"),
      ".",
    ],
  },
  { k: "h3", v: "2. Day-of-month and day-of-week are OR, not AND" },
  { k: "p", s: ['You might expect this to mean "Friday the 13th":'] },
  { k: "code", lang: "text", v: "0 0 13 * 5" },
  {
    k: "p",
    s: [
      "In standard (Vixie) cron, when ",
      strong("both"),
      " day fields are restricted, the job runs if ",
      strong("either"),
      " matches: every 13th of the month ",
      em("and"),
      ' every Friday. To get "Friday the 13th", schedule one field and check the other in your script:',
    ],
  },
  { k: "code", lang: "bash", v: '0 0 13 * * [ "$(date +\\%u)" = 5 ] && /path/to/job.sh' },
  {
    k: "p",
    s: [
      "Note the ",
      code("\\%"),
      ": inside a crontab, a bare ",
      code("%"),
      ' means "new line", so it has to be escaped.',
    ],
  },
  { k: "h3", v: '3. There\'s no "last day of the month" in standard cron' },
  {
    k: "p",
    s: [
      code("L"),
      " (as in ",
      code("0 0 L * *"),
      ") works in Quartz and some cloud schedulers, but not in classic cron. The portable trick is to run on days 28–31 and check whether tomorrow is the 1st:",
    ],
  },
  { k: "code", lang: "bash", v: '0 0 28-31 * * [ "$(date -d tomorrow +\\%d)" = 01 ] && /path/to/job.sh' },
  {
    k: "p",
    s: [
      code("date -d tomorrow"),
      " is GNU ",
      code("date"),
      ", which is what most Linux servers have. On macOS and BSD, use ",
      code("date -v+1d +%d"),
      ".",
    ],
  },
  { k: "h3", v: "4. Time zones" },
  { k: "p", s: ["Cron uses the time zone of whatever runs it, and that's often UTC, not yours."] },
  {
    k: "ul",
    items: [
      [
        strong("A Linux server"),
        " uses the system time zone, so check it with ",
        code("timedatectl"),
        ". Some cron versions accept a ",
        code("CRON_TZ="),
        " line at the top of the crontab.",
      ],
      [
        strong("GitHub Actions"),
        " runs schedules in UTC by default. A 2026 update added an optional time zone setting per schedule, so check the docs for your setup. The minimum interval is every 5 minutes, and runs can be delayed when GitHub is busy, so avoid exactly ",
        code(":00"),
        " for jobs that matter.",
      ],
      [
        strong("Kubernetes CronJobs"),
        " use ",
        code(".spec.timeZone"),
        " (stable since v1.27) with names like ",
        code('"Asia/Dhaka"'),
        ". Putting ",
        code("CRON_TZ"),
        " or ",
        code("TZ"),
        " inside ",
        code("schedule"),
        " is rejected.",
      ],
    ],
  },
  {
    k: "p",
    s: [
      "If daylight saving applies, a job at 02:30 can run twice or not at all on the night the clocks change. Schedule important jobs outside 01:00–03:00, or run them in UTC.",
    ],
  },
  { k: "h3", v: '5. Not every "cron" is the same cron' },
  {
    k: "table",
    head: [["System"], ["Fields"], ["Notes"]],
    rows: [
      [["Linux crontab"], ["5"], ["The baseline in this guide"]],
      [["GitHub Actions"], ["5"], ["UTC by default, minimum 5 minutes"]],
      [["Kubernetes"], ["5"], ["Time zone in a separate field"]],
      [["Quartz (Java), Spring"], ["6 or 7"], ["Adds ", strong("seconds"), " first, optional year, uses ", code("?")]],
      [["AWS EventBridge"], ["6"], ["Adds ", strong("year"), " at the end, requires ", code("?"), " in one day field"]],
    ],
  },
  {
    k: "p",
    s: [
      "A Quartz expression like ",
      code("0 0 9 * * ?"),
      " (09:00 daily) is invalid in a crontab, and a crontab line pasted into Spring will run at the wrong time. Always check which flavour your platform expects.",
    ],
  },
  { k: "h2", v: "Shortcuts", id: "shortcuts" },
  { k: "p", s: ["Many cron implementations accept named shortcuts:"] },
  {
    k: "table",
    head: [["Shortcut"], ["Same as"]],
    rows: [
      [[code("@hourly")], [code("0 * * * *")]],
      [[code("@daily")], [code("0 0 * * *")]],
      [[code("@weekly")], [code("0 0 * * 0")]],
      [[code("@monthly")], [code("0 0 1 * *")]],
      [[code("@yearly")], [code("0 0 1 1 *")]],
      [[code("@reboot")], ["Once, at startup"]],
    ],
  },
  {
    k: "p",
    s: [
      "They're readable, but not universal: GitHub Actions, for example, doesn't support them. When in doubt, write the five fields.",
    ],
  },
  { k: "h2", v: "Check before you deploy", id: "check-before-you-deploy" },
  {
    k: "p",
    s: [
      "Before a schedule goes live, read it back in plain words and look at its ",
      strong("next few run times"),
      '. Most cron bugs are obvious the moment you see "next run: every minute between 09:00 and 09:59".',
    ],
  },
  {
    k: "p",
    s: [
      "The ",
      a("utilyx cron parser", "/tools/cron-parser"),
      " does both as you type: it explains the expression in plain English and lists the next runs in your time zone and in UTC. It runs in your browser, so nothing about your infrastructure leaves your machine.",
    ],
  },
];

/** Newest first; the first entry is the featured post on /blog. */
export const POSTS: readonly BlogPost[] = [
  curlPost,
  blurPost,
  avifPost,
  keysPost,
  {
    slug: "decode-jwt-safely",
    title: "How to decode a JWT safely (without pasting it into a random website)",
    seoTitle: "How to decode a JWT safely, without a random website",
    seoDescription:
      "A JWT is Base64URL-encoded JSON. How to read one in your browser or terminal, what each claim means, and the mistakes that leak credentials.",
    description:
      "A JWT is just Base64URL-encoded JSON. Here's how to read one in your browser or terminal, what each claim means, and the mistakes that turn a harmless debug session into a leaked credential.",
    date: PUBLISHED,
    author: AUTHOR,
    tags: ["JWT", "Security", "Auth"],
    readingTime: "7 min",
    cover: "jwt",
    tool: { name: "JWT decoder", glyph: "jwt", tint: "teal", href: "/tools/jwt-decoder" },
    blocks: JWT_BLOCKS,
  },
  {
    slug: "json-parse-errors",
    title: "Why your JSON won't parse: 8 errors and how to fix each one",
    description:
      "Trailing commas, single quotes, comments, NaN and more. What each JSON.parse error message actually means, why it happens, and the quickest fix.",
    date: PUBLISHED,
    author: AUTHOR,
    tags: ["JSON", "Debugging", "JavaScript"],
    readingTime: "8 min",
    cover: "json",
    tool: { name: "JSON formatter", glyph: "{}", tint: "clay", href: "/tools/json-formatter" },
    blocks: JSON_BLOCKS,
  },
  pngPost,
  bigJsonPost,
  uuidPost,
  timestampsPost,
  hreflangPost,
  base64Post,
  urlPost,
  {
    slug: "cron-syntax-explained",
    title: "Cron syntax explained, with 20 copy-paste schedules",
    description:
      "How the five cron fields work, the special characters that trip people up, and 20 ready-made schedules, from every 5 minutes to the last day of the month.",
    date: PUBLISHED,
    author: AUTHOR,
    tags: ["Cron", "DevOps", "Reference"],
    readingTime: "9 min",
    cover: "cron",
    tool: { name: "Cron parser", glyph: "*/", tint: "sage", href: "/tools/cron-parser" },
    blocks: CRON_BLOCKS,
  },
];

/** "Coming soon" cards on /blog. Not routable, not in the feed or sitemap. */
export const PLANNED_POSTS: readonly PlannedPost[] = [
  {
    title: `How we run ${DISTINCT_LIVE_TOOL_COUNT} developer tools with zero servers`,
    tag: "Engineering",
    readingTime: "10 min",
    cover: "servers",
  },
];
