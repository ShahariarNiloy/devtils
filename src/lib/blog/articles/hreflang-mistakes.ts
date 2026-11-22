import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

const GOOGLE =
  "https://developers.google.com/search/docs/specialty/international/localized-versions";
const CANONICAL_DOC =
  "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls";

export const post: BlogPost = {
  slug: "hreflang-mistakes",
  title: "Hreflang mistakes that make Google ignore your translations",
  description:
    "Missing return links, en-UK, canonicals that point home, redirecting alternates: the hreflang errors that break a cluster, and how to fix each.",
  date: "2026-11-21",
  author: "The utilyx team",
  tags: ["SEO", "International", "Reference"],
  readingTime: "8 min",
  cover: "seo",
  tool: {
    name: "Hreflang validator",
    glyph: "hl",
    tint: "rose",
    href: "/tools/hreflang-validator",
  },
  blocks: [
    {
      k: "p",
      s: [
        "You translated the pricing page into German, added a row of ",
        code('<link rel="alternate" hreflang>'),
        " tags, and shipped. A month later, people searching in German still land on the English page. Nothing in your markup looks wrong. Nothing errors. The tags are simply being ignored.",
      ],
    },
    {
      k: "p",
      s: [
        "That is the uncomfortable thing about hreflang: it fails silently. A browser never reads it, so nothing breaks visibly, and a cluster with one bad link can be discarded without a single warning on the page itself. Almost every failure comes from a short list of mistakes, and Google documents nearly all of them. This post goes through that list, rule by rule, against Google's own guide, ",
        a("Tell Google about localized versions of your page", GOOGLE),
        ".",
      ],
    },
    {
      k: "p",
      s: [
        "One scope note before we start: everything here is about Google, because that is the engine whose rules are written down in one place. Other search engines document their own signals; check theirs before assuming they match.",
      ],
    },
    {
      k: "h2",
      v: "What hreflang does, and what it doesn't",
      id: "what-hreflang-does",
    },
    {
      k: "p",
      s: [
        "Hreflang tells Google that several URLs are versions of the same page for different languages or regions, so it can show each searcher the right one. The set of URLs that point at each other is usually called a ",
        strong("cluster"),
        ". Google's guide recommends it for fully translated sites, for pages where only the template is translated, and for small regional differences in one language, such as prices in pounds versus dollars.",
      ],
    },
    { k: "p", s: ["Three things it does not do:"] },
    {
      k: "ul",
      items: [
        [
          strong("It doesn't tell Google what language a page is in."),
          " The guide says Google detects the language with its own algorithms and doesn't use hreflang or the HTML ",
          code("lang"),
          " attribute for that. Keep ",
          code("lang"),
          " correct for screen readers and browsers, but don't expect it to fix search.",
        ],
        [
          strong("It doesn't make thin translations count as separate pages."),
          " If only the navigation is translated and the main content is the same, the versions can still be treated as duplicates.",
        ],
        [
          strong("It doesn't redirect anyone."),
          " It influences which URL appears in results. What happens after the click is up to you.",
        ],
      ],
    },
    {
      k: "h2",
      v: "Missing return links and missing self-references",
      id: "return-links-and-self-reference",
    },
    {
      k: "p",
      s: [
        "This is the mistake that sinks most clusters, and the guide is blunt about it: ",
        em(
          '"If two pages don\'t both point to each other, the tags will be ignored."',
        ),
        " Hreflang is a two-way handshake. If the English page lists the German one but the German page doesn't list the English one back, Google has no way to tell a genuine translation from a stranger's site claiming to be your German version.",
      ],
    },
    {
      k: "p",
      s: [
        "The second half of the rule catches people who get the first half right: ",
        em(
          '"Each language version must list itself as well as all other language versions."',
        ),
        " So every page in the cluster carries the ",
        strong("same full set"),
        " of tags, including one that points at itself. For a pricing page in US English, German and British English, all three pages get exactly this block:",
      ],
    },
    {
      k: "code",
      lang: "html",
      v: `<link rel="alternate" hreflang="en" href="https://example.com/pricing/" />
<link rel="alternate" hreflang="de" href="https://example.com/de/preise/" />
<link rel="alternate" hreflang="en-GB" href="https://example.com/uk/pricing/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/pricing/" />`,
    },
    {
      k: "p",
      s: [
        "Identical on every page. That property is worth building around: generate the block from one list of locales on the server, instead of hand-writing it per template. Hand-written blocks drift the first time someone adds a locale and updates two of the three pages.",
      ],
    },
    {
      k: "note",
      s: [
        strong("Partial clusters are allowed."),
        " Google says that if keeping every pair linked is impractical, you can leave some languages out. It suggests that newer versions at least link both ways with the main, originating version. Since the rule is about pairs of pages, the pairs that do link both ways can still work.",
      ],
    },
    {
      k: "h2",
      v: "Language and region codes Google actually accepts",
      id: "language-and-region-codes",
    },
    {
      k: "p",
      s: [
        "The format is a language, optionally followed by a region: ",
        code("de"),
        ", ",
        code("de-CH"),
        ", ",
        code("en-GB"),
        ". The language must be ",
        strong("ISO 639-1"),
        " (two letters) and the region ",
        strong("ISO 3166-1 Alpha 2"),
        ". Google's guide is explicit that only those two lists are supported. The common failures:",
      ],
    },
    {
      k: "table",
      head: [["Wrong"], ["Why it fails"], ["Use instead"]],
      rows: [
        [
          [code("en-UK")],
          [
            "UK is a reserved code, not the ISO code for the United Kingdom. Google ignores it.",
          ],
          [code("en-GB")],
        ],
        [
          [code("be")],
          [
            "A region on its own is read as a language. ",
            code("be"),
            " is Belarusian, not Belgium.",
          ],
          [code("nl-BE"), ", ", code("fr-BE")],
        ],
        [
          [code("en-EU")],
          ["EU and UN are reserved codes, also ignored."],
          ["Each country, or plain ", code("en")],
        ],
        [
          [code("es-419")],
          [
            "Valid BCP 47 for Latin American Spanish, but Google lists it as unsupported.",
          ],
          [code("es"), " or ", code("es-MX"), ", ", code("es-AR"), "…"],
        ],
        [
          [code("en_US")],
          ["Underscore, as in many locale files. The separator is a hyphen."],
          [code("en-US")],
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Case doesn't matter to Google, though uppercase regions are the ISO convention. Scripts are supported too: ",
        code("zh-TW"),
        " implies Traditional Chinese, and you can be explicit with ISO 15924 codes like ",
        code("zh-Hant"),
        " or ",
        code("zh-Hans-US"),
        ".",
      ],
    },
    {
      k: "p",
      s: [
        "A trap for anyone validating codes in JavaScript: the built-in ",
        code("Intl"),
        " API checks BCP 47, which is a different and larger standard. It will quietly ",
        em("fix"),
        " some invalid hreflang values and pass others straight through:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'for (const code of ["en-UK", "es-419", "en-EU", "be", "zh-hant-tw"]) {\n  console.log(code.padEnd(11), "->", Intl.getCanonicalLocales(code)[0]);\n}',
    },
    {
      k: "code",
      lang: "text",
      v: "en-UK       -> en-GB\nes-419      -> es-419\nen-EU       -> en-EU\nbe          -> be\nzh-hant-tw  -> zh-Hant-TW",
    },
    {
      k: "p",
      s: [
        "Node 26 rewrites ",
        code("en-UK"),
        " to ",
        code("en-GB"),
        " (CLDR treats UK as an alias), which is handy for fixing data but means it never reports the error. It accepts ",
        code("es-419"),
        " and ",
        code("en-EU"),
        ", both of which Google ignores, and it happily accepts ",
        code("be"),
        " because Belarusian is a real language. Validate hreflang against ISO 639-1 and ISO 3166-1 lists, not against ",
        code("Intl"),
        ".",
      ],
    },
    {
      k: "h2",
      v: "x-default is the fallback, not your main language",
      id: "x-default",
    },
    {
      k: "p",
      s: [
        "Google defines it narrowly: ",
        em(
          '"The reserved x-default value is used when no other language/region matches the user\'s browser setting."',
        ),
        " It is the page for everyone you didn't plan for. Its intended use is a language or country selector, or a home page that redirects by locale, though Google allows it on any page.",
      ],
    },
    {
      k: "p",
      s: [
        "Two misreadings come up often. The first is treating ",
        code("x-default"),
        " as a label for your primary language and leaving out the matching language tag. If your English page is the fallback, it needs both ",
        code('hreflang="en"'),
        " and ",
        code('hreflang="x-default"'),
        ", as in the block above. The second is adding it to some pages in the cluster and not others. It is part of the set, and the set must be identical everywhere.",
      ],
    },
    {
      k: "p",
      s: [
        "It is optional. Without it, a searcher whose language matches nothing simply gets whatever Google would have chosen anyway. But for any site with a selector page, it's the cheapest improvement on this list.",
      ],
    },
    {
      k: "h2",
      v: "Canonicals, noindex and redirects",
      id: "canonical-noindex-redirects",
    },
    {
      k: "p",
      s: [
        "Hreflang links pages that Google will index and show. Anything that stops a URL from being the indexed version of itself undermines the cluster. Google's localization guide doesn't spell all of this out, so here is what its ",
        a("canonicalization guide", CANONICAL_DOC),
        " says, and what follows from it.",
      ],
    },
    { k: "h3", v: "A canonical that points to another language" },
    {
      k: "p",
      s: [
        "The classic version: every localized page carries ",
        code('<link rel="canonical" href="https://example.com/pricing/">'),
        ", copied from the English template. That tells Google the German page is a duplicate of the English one and that the English URL is the one to index. Meanwhile the hreflang tags say the German page is its own version that should be shown to German speakers. The two signals contradict each other.",
      ],
    },
    {
      k: "p",
      s: [
        "Google's canonicalization guide says that when you use hreflang, you should specify a canonical in the ",
        strong("same language"),
        " (or the best substitute language if none exists). In practice: each localized page is canonical to itself. The canonical tag and the self-referencing hreflang tag should contain the same URL, character for character.",
      ],
    },
    { k: "h3", v: "Alternates that are noindex" },
    {
      k: "p",
      s: [
        "A ",
        code("noindex"),
        " page, via a meta tag or an ",
        code("X-Robots-Tag"),
        " header, can't appear in search results, so it can't be the version Google picks for a searcher either. Google's localization guide doesn't single this case out, but the logic is unavoidable: listing a noindex URL as an alternate points the cluster at a page that can never be shown. Usually it's a staging locale or a half-finished translation. Remove it from the set until it's ready, on every page.",
      ],
    },
    { k: "h3", v: "Alternates that redirect" },
    {
      k: "p",
      s: [
        "Google's canonicalization guide describes a redirect as a strong signal that the ",
        em("target"),
        " should become canonical. So an hreflang link to ",
        code("/es/"),
        " that 301s to ",
        code("/es-es/"),
        " points at a URL Google won't treat as the indexed page. List the final URL. The same goes for the small redirects that are easy to miss: ",
        code("http"),
        " to ",
        code("https"),
        ", a missing trailing slash, ",
        code("www"),
        " to the bare domain. Every hreflang ",
        code("href"),
        " should return ",
        code("200"),
        " directly.",
      ],
    },
    { k: "h2", v: "Relative URLs and other syntax traps", id: "syntax-traps" },
    {
      k: "p",
      s: [
        "Google's wording: ",
        em(
          '"Alternate URLs must be fully-qualified, including the transport method (http/https)."',
        ),
        " That rules out the shortcuts that work everywhere else in HTML:",
      ],
    },
    {
      k: "code",
      lang: "html",
      v: `<!-- Wrong: root-relative and protocol-relative -->
<link rel="alternate" hreflang="de" href="/de/preise/" />
<link rel="alternate" hreflang="de" href="//example.com/de/preise/" />

<!-- Right -->
<link rel="alternate" hreflang="de" href="https://example.com/de/preise/" />`,
    },
    { k: "p", s: ["A few smaller rules from the same guide:"] },
    {
      k: "ul",
      items: [
        [
          strong("Alternates can live on other domains."),
          " ",
          code("example.de"),
          " and ",
          code("example.com/de/"),
          " are both fine. The return-link rule still applies across domains.",
        ],
        [
          strong("Don't combine hreflang with other attributes"),
          " such as ",
          code("media"),
          " in a single tag.",
        ],
        [
          strong("One URL per code."),
          " Two different URLs both claiming ",
          code('hreflang="de"'),
          " in one set is ambiguous. Don't make Google choose.",
        ],
      ],
    },
    {
      k: "h2",
      v: "HTML, HTTP header or sitemap: pick one",
      id: "implementation-methods",
    },
    {
      k: "p",
      s: [
        "Google accepts three ways to declare a cluster and treats them as equivalent. You can use more than one, but the guide says there is ",
        em('"no benefit in Search"'),
        " in doing so, and every extra copy is another place for the sets to disagree. Google doesn't document how it resolves a conflict between methods, which is the best argument for not creating one. Pick the method that fits your stack and use only that.",
      ],
    },
    { k: "h3", v: "HTML link elements" },
    {
      k: "p",
      s: [
        "The block shown earlier, in the ",
        code("<head>"),
        " of every page. Easiest to reason about, and it ships with the page it describes. Each locale adds one tag of roughly 80 bytes to every page, which only starts to matter once you have dozens of locales.",
      ],
    },
    { k: "h3", v: "HTTP Link header" },
    {
      k: "p",
      s: [
        "For files that have no ",
        code("<head>"),
        ", such as PDFs. The header lists the same full set, comma-separated:",
      ],
    },
    {
      k: "code",
      lang: "http",
      v: `Link: <https://example.com/guide.pdf>; rel="alternate"; hreflang="en",
      <https://example.com/de/guide.pdf>; rel="alternate"; hreflang="de",
      <https://example.com/uk/guide.pdf>; rel="alternate"; hreflang="en-GB"`,
    },
    { k: "h3", v: "XML sitemap" },
    {
      k: "p",
      s: [
        "Best for large sites, because it keeps the sets out of your templates entirely. Declare the ",
        code("xhtml"),
        " namespace, then give every ",
        code("<url>"),
        " the complete set as ",
        code("<xhtml:link>"),
        " children, including the one that matches its own ",
        code("<loc>"),
        ". Yes, that means the set repeats once per URL:",
      ],
    },
    {
      k: "code",
      lang: "xml",
      v: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  <url>\n    <loc>https://example.com/pricing/</loc>\n    <xhtml:link rel="alternate" hreflang="en" href="https://example.com/pricing/"/>\n    <xhtml:link rel="alternate" hreflang="de" href="https://example.com/de/preise/"/>\n    <xhtml:link rel="alternate" hreflang="en-GB" href="https://example.com/uk/pricing/"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/pricing/"/>\n  </url>\n  <url>\n    <loc>https://example.com/de/preise/</loc>\n    <xhtml:link rel="alternate" hreflang="en" href="https://example.com/pricing/"/>\n    <xhtml:link rel="alternate" hreflang="de" href="https://example.com/de/preise/"/>\n    <xhtml:link rel="alternate" hreflang="en-GB" href="https://example.com/uk/pricing/"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/pricing/"/>\n  </url>\n  <url>\n    <loc>https://example.com/uk/pricing/</loc>\n    <xhtml:link rel="alternate" hreflang="en" href="https://example.com/pricing/"/>\n    <xhtml:link rel="alternate" hreflang="de" href="https://example.com/de/preise/"/>\n    <xhtml:link rel="alternate" hreflang="en-GB" href="https://example.com/uk/pricing/"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/pricing/"/>\n  </url>\n</urlset>',
    },
    {
      k: "p",
      s: [
        "Our ",
        a("hreflang sitemap generator", "/tools/hreflang-sitemap"),
        " builds exactly this from a page-by-locale table, and the ",
        a("hreflang generator", "/tools/hreflang-generator"),
        " produces the HTML block if you'd rather keep it in the head. Both run in your browser.",
      ],
    },
    {
      k: "h2",
      v: "Check the whole cluster, not one page",
      id: "check-the-cluster",
    },
    {
      k: "p",
      s: [
        "Most of these mistakes are invisible from a single page. A page can be perfect on its own and still fail because its sibling doesn't link back, or because the URL it links to redirects. The only real check fetches every page in the cluster and compares them.",
      ],
    },
    {
      k: "p",
      s: [
        "Here is a small Node script (Node 18 or later, no dependencies) that does that for HTML link elements. It fetches each URL without following redirects, then reports bad status codes, noindex, foreign canonicals, missing self-references, relative URLs and missing return links:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: '// Usage: node check-hreflang.mjs https://example.com/ https://example.com/de/ ...\n// Regex parsing: fine for a quick audit of your own pages, not a general HTML parser.\nconst attr = (tag, name) => tag.match(new RegExp(`${name}\\\\s*=\\\\s*["\']([^"\']*)["\']`, "i"))?.[1];\n\nasync function inspect(url) {\n  const res = await fetch(url, { redirect: "manual" });\n  const html = res.status === 200 ? await res.text() : "";\n  const links = html.match(/<link\\b[^>]*>/gi) ?? [];\n  const alternates = new Map();\n  let canonical = null;\n  for (const tag of links) {\n    const rel = (attr(tag, "rel") ?? "").toLowerCase().split(/\\s+/);\n    const href = attr(tag, "href");\n    if (rel.includes("alternate") && attr(tag, "hreflang")) alternates.set(href, attr(tag, "hreflang"));\n    if (rel.includes("canonical")) canonical = href;\n  }\n  const robots = `${res.headers.get("x-robots-tag") ?? ""} ${html.match(/<meta[^>]+name=["\']robots["\'][^>]*>/i)?.[0] ?? ""}`;\n  return { status: res.status, alternates, canonical, noindex: /noindex/i.test(robots) };\n}\n\nconst urls = process.argv.slice(2);\nconst pages = new Map();\nfor (const url of urls) pages.set(url, await inspect(url));\n\nfor (const [url, p] of pages) {\n  const problems = [];\n  if (p.status !== 200) problems.push(`returns ${p.status}; hreflang targets should return 200`);\n  if (p.noindex) problems.push("is noindex");\n  if (p.canonical && p.canonical !== url) problems.push(`canonical points to ${p.canonical}`);\n  if (p.status === 200 && !p.alternates.has(url)) problems.push("does not list itself");\n  for (const [href] of p.alternates) {\n    if (!/^https?:\\/\\//.test(href)) problems.push(`relative URL ${href}`);\n    const target = pages.get(href);\n    if (target?.status === 200 && !target.alternates.has(url)) problems.push(`${href} does not link back`);\n  }\n  console.log(problems.length ? `✗ ${url}\\n    ${problems.join("\\n    ")}` : `✓ ${url}`);\n}',
    },
    {
      k: "p",
      s: [
        "We ran it against a deliberately broken four-page fixture: the German page lists itself with a relative URL and links to a French page that doesn't link back, the French page is canonical to the English home page, and the Spanish URL is a 301. The output:",
      ],
    },
    {
      k: "code",
      lang: "text",
      v: "✓ https://example.com/\n✗ https://example.com/de/\n    does not list itself\n    relative URL /de/\n    https://example.com/fr/ does not link back\n✗ https://example.com/fr/\n    canonical points to https://example.com/\n✗ https://example.com/es/\n    returns 301; hreflang targets should return 200",
    },
    {
      k: "p",
      s: [
        "Two honest limits. It compares URLs as exact strings, so ",
        code("/de"),
        " and ",
        code("/de/"),
        " count as different. That is deliberate, because one of them is a redirect. And it only reads HTML tags; for header or sitemap setups you'd parse those instead.",
      ],
    },
    {
      k: "p",
      s: [
        "For a quick check of one page while you're editing templates, paste its ",
        code("<head>"),
        " into the ",
        a("utilyx hreflang validator", "/tools/hreflang-validator"),
        ". It flags invalid codes (including ",
        code("en-UK"),
        ", ",
        code("es-419"),
        " and region-only values), relative URLs, duplicate codes, a missing self-reference, a missing ",
        code("x-default"),
        " and a canonical pointing elsewhere, then gives you a corrected block. What it can't do from one pasted page is confirm return links, status codes or noindex on the other pages. For that you need every page, which is what the script above, or your crawler of choice, is for.",
      ],
    },
  ],
};
