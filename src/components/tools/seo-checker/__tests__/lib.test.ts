/**
 * SEO checker: the SSRF guard on the fetch endpoint, robots.txt and JSON-LD
 * reading, and the page audit.
 *
 * Run: npx tsx src/components/tools/seo-checker/__tests__/lib.test.ts
 */

/* eslint-disable no-console */
import { checkTarget, decodeBody, FetchError, isPublicAddress } from "@/lib/seo-fetch/fetch-page";
import { parseRobotsTxt } from "../../robots-txt-generator/robots-txt-generator.lib";
import { readIcons } from "../../seo-shared/page-meta.lib";
import { assetChecks, auditPage, iconChecks, readJsonLd } from "../seo-checker.lib";
import { blockedFor } from "@/lib/seo-fetch/inspect-asset";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`, detail ?? "");
  }
}
const rejects = (raw: string) => {
  try {
    checkTarget(raw);
    return false;
  } catch (e) {
    return e instanceof FetchError;
  }
};

console.log("SSRF guard");
const blocked = [
  "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
  "224.0.0.1", "255.255.255.255", "::1", "::", "fe80::1", "fd00::1", "fc00::abcd", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
  "64:ff9b::a9fe:a9fe", "2001:db8::1", "ff02::1",
];
const open = ["1.1.1.1", "8.8.8.8", "172.32.0.1", "192.169.0.1", "2606:4700:4700::1111", "2a00:1450:4001:80b::200e", "::ffff:8.8.8.8"];
check("private, loopback, link-local, metadata and reserved addresses refused", blocked.every((ip) => !isPublicAddress(ip)), blocked.filter(isPublicAddress));
check("public addresses allowed", open.every(isPublicAddress), open.filter((ip) => !isPublicAddress(ip)));
check("non-addresses refused", !isPublicAddress("localhost") && !isPublicAddress("example.com"));
check("URL guard: schemes, ports, credentials, private hosts", [
  "file:///etc/passwd", "ftp://example.com", "http://example.com:8080/", "https://user:pw@example.com/",
  "http://localhost/", "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "http://intranet/",
  "http://printer.local/", "http://10.0.0.1/admin", "http://[fd00::1]/",
].every(rejects));
check("URL guard: normal sites pass, scheme added when missing", checkTarget("example.com/page").href === "https://example.com/page" && checkTarget("http://example.com:80/").protocol === "http:");
check("charset honoured", decodeBody(Buffer.from([0x63, 0x61, 0x66, 0xe9]), "text/html; charset=windows-1252") === "café");
check("meta charset honoured", decodeBody(Buffer.concat([Buffer.from('<meta charset="iso-8859-1">'), Buffer.from([0xe9])]), "text/html").endsWith("é"));

console.log("robots.txt");
const parsed = parseRobotsTxt(`# test
User-agent: Googlebot
User-agent: Bingbot
Disallow: /private
Allow: /private/ok

User-agent: *
Disallow:
Crawl-delay: 5
Sitemap: https://example.com/sitemap.xml
`);
const rules = parsed.rules;
check("agents sharing a group get the same rules; empty Disallow adds none", rules.length === 4 && rules.filter((r) => r.ua === "Bingbot").length === 2, rules);
check("sitemaps and crawl-delay read", parsed.sitemaps[0] === "https://example.com/sitemap.xml" && parsed.delay === "5", parsed);

console.log("JSON-LD");
const ld = readJsonLd(`<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":["WebSite","Thing"]}]}</script>
<!-- <script type="application/ld+json">{"@type":"Hidden"}</script> -->
<script type='application/ld+json'>{ broken </script>`);
check("types from @graph and arrays; commented-out blocks skipped; broken JSON reported", ld.length === 2 && ld[0].types.join() === "Organization,WebSite,Thing" && !ld[1].ok, ld);

console.log("audit");
const good = `<!doctype html><html lang="en"><head>
<title>Merge PDF — free, in your browser | utilyx</title>
<meta name="description" content="Combine PDFs into one in your browser: reorder, rotate or delete pages first. Nothing is uploaded, no sign-up, no watermark.">
<meta name="viewport" content="width=device-width">
<link rel="canonical" href="https://www.utilyx.dev/tools/merge-pdf">
<link rel="icon" href="/favicon.ico">
<meta property="og:title" content="Merge PDF"><meta property="og:description" content="Combine PDFs.">
<meta property="og:image" content="https://www.utilyx.dev/og/merge-pdf.png"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Merge PDF"}</script>
<svg><title>icon</title></svg>
</head><body><h1>Merge PDF</h1><img src="a.png" alt=""></body></html>`;
const ok = auditPage({ url: "https://www.utilyx.dev/tools/merge-pdf", html: good, status: 200, hops: [{ url: "https://www.utilyx.dev/tools/merge-pdf", status: 200 }], headers: {}, robotsTxt: "User-agent: *\nDisallow: /api/" });
const problems = ok.sections.flatMap((s) => s.checks).filter((c) => c.level === "err" || c.level === "warn");
check("a well-built page is indexable with no errors or warnings", ok.indexable === true && problems.length === 0, problems);
check("svg <title> isn't the page title; structured data found", ok.serp.title.startsWith("Merge PDF") && ok.jsonLd[0].types[0] === "WebApplication");

const bad = auditPage({
  url: "https://shop.example/item?id=1",
  html: `<html><head><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="/item"><link rel="canonical" href="/item2"><meta property="og:image" content="/img.png"></head><body><img src=x></body></html>`,
  status: 200,
  hops: [{ url: "http://shop.example/item?id=1", status: 302 }, { url: "https://shop.example/item?id=1", status: 200 }],
  headers: { "x-robots-tag": "noindex" },
  robotsTxt: "User-agent: *\nDisallow: /item",
});
const text = bad.sections.flatMap((s) => s.checks.map((c) => `${c.level}:${c.text}`)).join("\n");
check("noindex (meta and header) and robots.txt block → not indexable, with reasons", bad.indexable === false && bad.blockers.length === 3, bad.blockers);
check("temporary redirect, duplicate canonical, relative canonical, nofollow, missing title, alt and lang all reported", [
  /warn:A temporary redirect/, /err:The page declares 2 canonical/, /warn:The canonical URL is relative/, /warn:Links on this page are marked nofollow/,
  /err:Add a title/, /warn:1 of 1 images have no alt/, /warn:<html> has no lang/, /warn:og:image is relative/,
].every((re) => re.test(text)), text);
check("relative og:image resolved for the preview", bad.social.image === "https://shop.example/img.png");

const pasted = auditPage({ url: "", html: good });
check("pasted without a URL: no verdict, no robots or status checks", pasted.indexable === null && pasted.sections[0].checks[0].level === "info");
check("pasted noindex is still not indexable", auditPage({ url: "", html: '<meta name="robots" content="noindex">' }).indexable === false);

console.log("favicons");
const gh = readIcons(`<link rel="fluid-icon" href="https://github.com/fluidicon.png"><link rel="mask-icon" href="/pin.svg">
<link rel="alternate icon" type="image/png" href="https://github.githubassets.com/favicons/favicon.png"><link rel="icon" type="image/svg+xml" href="https://github.githubassets.com/favicons/favicon.svg">`, "https://github.com/");
check("mask-icon and fluid-icon aren't favicons; SVG first; /favicon.ico last", gh.map((c) => c.href.split("/").pop()).join() === "favicon.svg,favicon.png,favicon.ico" && gh[2].kind === "default", gh);
const ux = readIcons(`<link rel="icon" href="/favicon.ico?1" sizes="16x16"><link rel="icon" href="/icon-96.png" sizes="96x96"><link rel="apple-touch-icon" href="/apple.png" sizes="180x180">`, "https://www.utilyx.dev/tools/x");
check("largest declared square before smaller; Apple icon after favicons", ux.map((c) => c.href.replace("https://www.utilyx.dev", "")).join() === "/icon-96.png,/favicon.ico?1,/apple.png,/favicon.ico", ux);
check("relative to the page, and to <base href>", readIcons(`<link rel="icon" href="y18.svg">`, "https://news.ycombinator.com/item?id=1")[0].href === "https://news.ycombinator.com/y18.svg" && readIcons(`<base href="https://cdn.example.net/app/"><link rel="shortcut icon" href="i.png">`, "https://example.net/")[0].href === "https://cdn.example.net/app/i.png");
check("an empty data: icon opts out (no /favicon.ico guess)", readIcons(`<link rel=icon href=data:,>`, "https://example.com/").length === 0);
check("pasted without a URL: only inline icons", readIcons(`<link rel="icon" href="/a.png"><link rel="icon" href="data:image/png;base64,AAAA">`, "").map((c) => c.kind).join() === "icon");
const cands = readIcons(`<link rel="icon" href="/gone.png">`, "https://e.com/");
const fallbackOk = iconChecks(cands, { "https://e.com/gone.png": { state: "error" }, "https://e.com/favicon.ico": { state: "ok", w: 16, h: 16 } }, true);
check("broken declared icon is an error; a tiny fallback is flagged", fallbackOk.some((c) => c.level === "err" && /gone\.png/.test(c.text)) && fallbackOk.some((c) => /48 × 48/.test(c.text)) && fallbackOk.some((c) => /No <link/.test(c.text)), fallbackOk);
check("still loading → no verdict yet", iconChecks(cands, {}, true).length === 0);
const svgOk = iconChecks(readIcons(`<link rel="icon" href="/i.svg">`, "https://e.com/"), { "https://e.com/i.svg": { state: "ok", w: 300, h: 300 }, "https://e.com/favicon.ico": { state: "error" } }, true);
check("a loading SVG passes; the unused /favicon.ico failing isn't a problem", svgOk.length === 1 && svgOk[0].level === "ok", svgOk);

console.log("site name");
const named = (html: string, url: string) => auditPage({ url, html }).serp.site;
check("site name: WebSite JSON-LD, then og:site_name, then the registrable domain", named('<script type="application/ld+json">{"@graph":[{"@type":"WebSite","name":"Acme Store"}]}</script><meta property="og:site_name" content="Acme">', "https://shop.acme.com/") === "Acme Store" && named('<meta property="og:site_name" content="Hacker News">', "https://news.ycombinator.com/") === "Hacker News" && named("", "https://news.ycombinator.com/") === "Ycombinator" && named("", "https://shop.example.co.uk/") === "Example");
console.log("crawler view of images");
const lvls = (cs: { level: string; text: string }[]) => cs.map((c) => c.level).join();
check("huge share image is an error, 2 MB a warning", lvls(assetChecks("share", { url: "u", status: 200, contentType: "image/png", bytes: 6 * 1048576 })) === "err" && lvls(assetChecks("share", { url: "u", status: 200, contentType: "image/jpeg", bytes: 2 * 1048576 })) === "warn");
check("an HTML 'image' (login/error page) is caught", /not an image/.test(assetChecks("share", { url: "u", status: 200, contentType: "text/html" })[0].text));
check("404 to crawlers", /answers 404/.test(assetChecks("favicon", { url: "u", status: 404 })[0].text));
check(".ico as octet-stream is only a note", lvls(assetChecks("favicon", { url: "https://e.com/favicon.ico", status: 200, contentType: "application/octet-stream", bytes: 900 })) === "info,ok");
check("robots blocks: Googlebot-Image for favicons, Twitterbot for share images", /Googlebot-Image/.test(assetChecks("favicon", { url: "u", status: 200, contentType: "image/png", blocked: { "Googlebot-Image": true, Twitterbot: false } })[0].text) && /Twitterbot/.test(assetChecks("share", { url: "u", status: 200, contentType: "image/png", blocked: { "Googlebot-Image": false, Twitterbot: true } })[0].text));
const rr = parseRobotsTxt("User-agent: Googlebot\nDisallow: /img/\n\nUser-agent: *\nDisallow: /private/").rules;
check("Googlebot-Image falls back to Googlebot's group, others to *", blockedFor(rr, ["Googlebot-Image", "Googlebot"], "/img/a.png") && !blockedFor(rr, ["Twitterbot"], "/img/a.png") && blockedFor(rr, ["Twitterbot"], "/private/x.png"));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
