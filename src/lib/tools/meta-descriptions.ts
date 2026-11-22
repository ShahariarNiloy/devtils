/**
 * Longer search-result descriptions (≈120–155 chars) for tools whose
 * registry `description` is short. The registry text stays < 100 chars
 * (social cards, integrity test); this is only the `<meta name="description">`.
 * Describe only what each tool actually does.
 */
export const META_DESCRIPTIONS: Record<string, string> = {
  base64:
    "Encode and decode Base64 in your browser: text or files, URL-safe and MIME variants, data URIs, and clear errors for invalid input. Free, no sign-up.",
  "color-converter":
    "Convert colours between HEX, RGB, HSL, HSB and OKLCH with a live preview, contrast checks and a full tint-and-shade scale. Free and in your browser.",
  "cron-parser":
    "Paste a cron expression to read it in plain English and see its next run times. Explains each field, ranges, steps and lists. Free, in your browser.",
  "html-entity":
    "Escape text for HTML or turn entities back into characters: named, decimal and hex references, as you type. Free, no sign-up, runs in your browser.",
  "image-compressor":
    "Compress JPEG, PNG, WebP and AVIF in your browser with real output sizes, size budgets, side-by-side comparison and colour-profile handling. Free.",
  "json-to-zod":
    "Turn a sample JSON payload into a Zod schema with inferred TypeScript types. Handles nested objects, arrays and optional fields. Free, in your browser.",
  "jwt-decoder":
    "Decode a JWT's header and payload, check expiry, audience and issuer, and verify HS, RS, PS and ES signatures with Web Crypto, in your browser. Free.",
  "url-encoder":
    "Percent-encode text for URLs or decode it back: component or full-URL mode, + or %20 for spaces, and the position of any bad escape. Free, in your browser.",
  "url-parser":
    "Break a URL into protocol, host, port, path, query parameters and fragment, and strip tracking parameters like utm_source. Free, runs in your browser.",
  "yaml-to-json":
    "Convert YAML to JSON (and back) with multi-document support and clear errors that point at bad indentation. Free, no sign-up, runs in your browser.",
  "hreflang-generator":
    "Build hreflang tags for every language and region, with x-default and return links, as HTML, HTTP headers or sitemap entries. Free, in your browser.",
  "hreflang-validator":
    "Paste a page's head to find hreflang mistakes: invalid codes, missing self-references and return links, x-default issues. Free, in your browser.",
  "hreflang-sitemap":
    "Turn a page × locale table into an XML sitemap with xhtml:link hreflang alternates for every URL, ready to upload. Free, runs in your browser.",
  "canonical-generator":
    "Clean any URL into a consistent canonical (protocol, host, trailing slash, tracking parameters) and copy the rel=canonical tag. Free, in your browser.",
  "robots-txt-generator":
    "Build robots.txt rules for any crawler, then test a path against them to see whether it is allowed or blocked, and why. Free, runs in your browser.",
  "sitemap-validator":
    "Paste an XML sitemap to catch format, URL, date and limit errors, with line numbers and counts. Handles large sitemaps. Free, runs in your browser.",
  "open-graph-generator":
    "Write Open Graph and Twitter card tags and preview how your link will look when shared on social sites and chat apps. Free, runs in your browser.",
  "curl-to-code":
    "Paste a curl command and get fetch, axios, Python requests, Go or PHP code. Secrets become env variables; browser headers are dropped. In your browser.",
  "curl-generator":
    "Build a request in a form and copy a correctly quoted curl command for bash, Windows cmd or PowerShell. Import and edit existing commands. Free.",
  "curl-to-fetch":
    "Convert a curl command to JavaScript fetch() for the browser or Node 18+: headers, JSON, forms, uploads, auth and timeouts. Free, runs in your browser.",
  "curl-to-axios":
    "Convert a curl command to an axios request with params, data, auth and timeout options. Secrets become env variables. Free, runs in your browser.",
  "curl-to-python":
    "Convert a curl command to Python requests code: params, headers, json=, files=, auth= and timeout=. Secrets stay out of the code. Free, in your browser.",
  "curl-to-go":
    "Convert a curl command to Go net/http code that compiles: headers, JSON and form bodies, multipart uploads, basic auth and timeouts. Free, in your browser.",
  "curl-to-php":
    "Convert a curl command to PHP Guzzle code: headers, query, json, form_params, multipart, auth and timeout options. Free, runs in your browser.",
  "meta-preview":
    "See how your page title and meta description will look in search results, with pixel-width checks for truncation. Free, runs in your browser.",
};
