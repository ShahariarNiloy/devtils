/**
 * cURL converter: tokenizer, parser, generators, form round-trip.
 *
 * Run: npx tsx src/components/tools/curl-converter/__tests__/lib.test.ts
 */

/* eslint-disable no-console */
import { tokenize, detectDialect } from "../curl-tokenize.lib";
import { parseCurl, type CurlRequest } from "../curl-parse.lib";
import { generate, type GenOptions, type Lang } from "../curl-generate.lib";
import {
  DEFAULT_FORM,
  formFromRequest,
  requestFromForm,
} from "../curl-form.lib";
import { parseJson, jsonCompact, numberIsSafe } from "../curl-json.lib";
import { highlight } from "../curl-highlight.lib";
import { SAMPLES } from "../curl-samples";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`, detail === undefined ? "" : detail);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function req(src: string): CurlRequest {
  const r = parseCurl(src);
  if (!r.ok) throw new Error(`parse failed: ${src} → ${JSON.stringify(r)}`);
  return r.req;
}
const OPT: GenOptions = {
  env: true,
  dropNoise: true,
  curl: { shell: "bash", multi: true, long: false },
};
const gen = (lang: Lang, src: string, o: Partial<GenOptions> = {}) =>
  generate(lang, req(src), { ...OPT, ...o }).code;

console.log("tokenizer");
check(
  "bash quotes",
  eq(tokenize(`curl 'a b' "c \\"d\\"" e\\ f`), ["curl", "a b", 'c "d"', "e f"]),
);
check(
  "bash continuation",
  eq(tokenize("curl \\\n  -H 'x: 1' \\\n  https://a.b"), [
    "curl",
    "-H",
    "x: 1",
    "https://a.b",
  ]),
);
check(
  "ANSI-C quoting",
  eq(tokenize("curl $'a\\nb\\x41\\u00e9\\''"), ["curl", "a\nbAé'"]),
);
check(
  "cmd detected",
  detectDialect('curl ^"https://a.b/^" ^\n  -H ^"accept: */*^"') === "cmd",
);
check(
  "cmd (Chrome) tokens",
  eq(
    tokenize(
      'curl ^"https://a.b/?q=1^&r=2^" ^\n  -H ^"accept: */*^" ^\n  --data-raw ^"^{^\\^"a^\\^":1^}^"',
    ),
    [
      "curl",
      "https://a.b/?q=1&r=2",
      "-H",
      "accept: */*",
      "--data-raw",
      '{"a":1}',
    ],
  ),
  tokenize(
    'curl ^"https://a.b/?q=1^&r=2^" ^\n  -H ^"accept: */*^" ^\n  --data-raw ^"^{^\\^"a^\\^":1^}^"',
  ),
);
check(
  "PowerShell tokens",
  eq(tokenize("curl.exe `\n  -H 'it''s: ok' `\n  \"https://a.b/`$x\""), [
    "curl.exe",
    "-H",
    "it's: ok",
    "https://a.b/$x",
  ]),
);

console.log("parser");
const j = req(SAMPLES.json.src);
check("method from -X", j.method === "POST");
check("json body", j.body.kind === "json");
check(
  "bearer header kept",
  j.headers.some(([k, v]) => k === "Authorization" && v.startsWith("Bearer ")),
);
const chrome = req(SAMPLES.chrome.src);
check(
  "query split",
  eq(chrome.query, [
    ["page", "2"],
    ["status", "open"],
  ]),
);
check("--compressed", chrome.compressed);
const g = req(SAMPLES.get.src);
check(
  "-G moves data to the query",
  g.method === "GET" &&
    g.body.kind === "none" &&
    g.query.some(([k, v]) => k === "q" && v === "language:go stars:>1000"),
);
const up = req(SAMPLES.upload.src);
check(
  "multipart file + type",
  up.body.kind === "multipart" &&
    up.body.fields[0].file === "./avatar.png" &&
    up.body.fields[0].type === "image/png",
);
check("-u basic auth", eq(up.auth, { user: "ada", pass: "s3cret-pass" }));
check("-m timeout", up.timeout === 30);
const form = req(SAMPLES.form.src);
check(
  "form body decoded",
  form.body.kind === "form" &&
    eq(
      form.body.fields.find(([k]) => k === "scope"),
      ["scope", "read write"],
    ),
);
check(
  "-k warns",
  form.insecure && form.warnings.some((w) => w.text.startsWith("-k")),
);
check(
  "--retry value not taken as URL",
  req("curl --retry 3 https://a.b/x").url === "https://a.b/x",
);
check(
  "--cacert value not taken as URL",
  req("curl --cacert ca.pem https://a.b/x").url === "https://a.b/x",
);
check("-XPOST attached", req("curl -XPOST https://a.b").method === "POST");
check(
  "--header=value form",
  req("curl --header='X-A: 1' https://a.b").headers[0][1] === "1",
);
check("-I is HEAD", req("curl -I https://a.b").method === "HEAD");
check(
  "url credentials → basic auth",
  eq(req("curl https://u%40x:p%2Bw@a.b/").auth, { user: "u@x", pass: "p+w" }),
);
check(
  "no scheme → http",
  req("curl example.com/a").url === "http://example.com/a",
);
check(
  "--json sets headers",
  (() => {
    const r = req(`curl --json '{"a":1}' https://a.b`);
    return r.method === "POST" && r.headers.some(([k]) => k === "Accept");
  })(),
);
check(
  "--url-query",
  eq(req("curl --url-query 'a=1 2' https://a.b").query, [["a", "1 2"]]),
);
check(
  "-b cookie string",
  req("curl -b 'a=1; b=2' https://a.b").headers.some(
    ([k, v]) => k === "Cookie" && v === "a=1; b=2",
  ),
);
check(
  "not curl → error",
  (() => {
    const r = parseCurl("wget https://a.b");
    return !r.ok && !r.empty;
  })(),
);
check(
  "empty",
  (() => {
    const r = parseCurl("   ");
    return !r.ok && r.empty;
  })(),
);
check(
  "no URL → error",
  (() => {
    const r = parseCurl("curl -H 'a: b'");
    return !r.ok && !r.empty && r.error.includes("No URL");
  })(),
);
check(
  "ftp refused",
  (() => {
    const r = parseCurl("curl ftp://a.b/x");
    return !r.ok && !r.empty;
  })(),
);

console.log("lossless numbers");
check(
  "big int kept",
  jsonCompact(parseJson('{"id":12345678901234567890,"p":1.50}')) ===
    '{"id":12345678901234567890,"p":1.50}',
);
check(
  "safe check",
  numberIsSafe("9007199254740991") &&
    !numberIsSafe("9007199254740993") &&
    numberIsSafe("1.50") &&
    !numberIsSafe("0.10000000000000000555"),
);
const big = `curl https://a.b -H 'Content-Type: application/json' -d '{"id":12345678901234567890}'`;
check(
  "fetch sends big ints as text",
  gen("fetch", big).includes('body: "{\\"id\\":12345678901234567890}"'),
  gen("fetch", big),
);
check(
  "python keeps big int literal",
  gen("python", big).includes('"id": 12345678901234567890'),
);
check("go keeps big int", gen("go", big).includes("12345678901234567890"));
check("curl keeps big int", gen("curl", big).includes("12345678901234567890"));

console.log("generators");
const fetchJ = gen("fetch", SAMPLES.json.src);
check(
  "fetch: env token",
  fetchJ.includes("`Bearer ${process.env.API_TOKEN}`"),
  fetchJ,
);
check(
  "fetch: JSON.stringify body",
  fetchJ.includes("body: JSON.stringify({") && fetchJ.includes("seats: 3"),
  fetchJ,
);
check("fetch: reads json", fetchJ.endsWith("const data = await res.json();"));
check("fetch: no secret value", !fetchJ.includes("sk_test"));
check(
  "fetch: secret kept when env off",
  gen("fetch", SAMPLES.json.src, { env: false }).includes(
    "Bearer sk_test_51Hx9cAbCdEf",
  ),
);
const fetchC = gen("fetch", SAMPLES.chrome.src);
check(
  "fetch: browser headers dropped",
  !/sec-ch-ua|user-agent|priority/i.test(fetchC),
  fetchC,
);
check("fetch: cookie → env", fetchC.includes("process.env.COOKIE"));
check("fetch: csrf → env", fetchC.includes("process.env.CSRF_TOKEN"));
check(
  "fetch: browser headers kept when asked",
  gen("fetch", SAMPLES.chrome.src, { dropNoise: false }).includes(
    '"sec-fetch-mode"',
  ),
);
check(
  "fetch: timeout",
  gen("fetch", SAMPLES.upload.src).includes(
    "signal: AbortSignal.timeout(30000)",
  ),
);
check(
  "fetch: basic auth",
  gen("fetch", SAMPLES.upload.src).includes(
    '"Basic " + btoa(`ada:${process.env.API_PASSWORD}`)',
  ),
);
check(
  "fetch: GET has no method",
  !gen("fetch", "curl https://a.b").includes("method:"),
);
check(
  "fetch: merged duplicate headers",
  gen("fetch", "curl https://a.b -H 'X-A: 1' -H 'x-a: 2'").includes(
    '"X-A": "1, 2"',
  ),
);

const ax = gen("axios", SAMPLES.get.src);
check(
  "axios: params",
  ax.includes("params: {") && ax.includes('per_page: "5"'),
  ax,
);
check(
  "axios: drops json content-type",
  !gen("axios", SAMPLES.json.src).includes('"Content-Type"'),
);
check(
  "axios: auth object",
  gen("axios", SAMPLES.upload.src).includes(
    'auth: { username: "ada", password: process.env.API_PASSWORD }',
  ),
);

const py = gen("python", SAMPLES.json.src);
check(
  "python: imports os first",
  py.startsWith("import os\n\nimport requests"),
  py,
);
check(
  "python: f-string token",
  py.includes(`f"Bearer {os.environ['API_TOKEN']}"`),
);
check(
  "python: json=payload",
  py.includes("json=payload") && py.includes('"plan": "pro"'),
);
check(
  "python: True/None literals",
  gen("python", `curl https://a.b -d '{"a":true,"b":null}'`).includes(
    '"a": True',
  ),
);
const pyUp = gen("python", SAMPLES.upload.src);
check(
  "python: file with type",
  pyUp.includes('("avatar.png", open("./avatar.png", "rb"), "image/png")'),
  pyUp,
);
check("python: timeout", pyUp.includes("timeout=30"));

const go = gen("go", SAMPLES.json.src);
check("go: package main", go.startsWith("package main"));
check(
  "go: env header",
  go.includes(
    'req.Header.Set("Authorization", "Bearer "+os.Getenv("API_TOKEN"))',
  ),
  go,
);
check(
  "go: imports sorted & os",
  go.includes('"os"') && go.includes('"strings"'),
);
const go2 = gen("go", "curl https://a.b -F a=@x.png -F b=@y.png -m 2.5");
check(
  "go: two files compile-safe names",
  go2.includes("file1, err :=") &&
    go2.includes("file2, err :=") &&
    go2.includes("part2, err :="),
  go2,
);
check("go: fractional timeout in ms", go2.includes("2500 * time.Millisecond"));
check(
  "go: whole timeout in seconds",
  gen("go", SAMPLES.upload.src).includes("30 * time.Second"),
);

const php = gen("php", SAMPLES.json.src);
check(
  "php: guzzle",
  php.includes("new GuzzleHttp\\Client()") && php.includes("'json' => ["),
  php,
);
check("php: env token", php.includes("'Bearer ' . getenv('API_TOKEN')"));
check(
  "php: form_params",
  gen("php", SAMPLES.form.src).includes("'form_params' => ["),
);

console.log("curl writer");
const r = req(SAMPLES.json.src);
const bash = generate("curl", r, { ...OPT, env: true }).code;
check(
  "bash: env in double quotes",
  bash.includes('-H "Authorization: Bearer $API_TOKEN"'),
  bash,
);
check("bash: POST implied by body", !bash.includes("-X POST"));
check("bash: line continuations", bash.includes(" \\\n  -H"));
const cmd = generate("curl", r, {
  ...OPT,
  curl: { shell: "cmd", multi: true, long: false },
}).code;
check(
  "cmd: %VAR% and ^",
  cmd.includes("%API_TOKEN%") && cmd.includes(" ^\n"),
  cmd,
);
const ps = generate("curl", r, {
  ...OPT,
  curl: { shell: "ps", multi: false, long: true },
}).code;
check(
  "ps: curl.exe, $env:, long flags, one line",
  ps.startsWith("curl.exe ") &&
    ps.includes("$env:API_TOKEN") &&
    ps.includes("--header") &&
    !ps.includes("\n"),
  ps,
);
const round = parseCurl(generate("curl", r, { ...OPT, env: false }).code);
check(
  "bash output parses back to the same request",
  round.ok &&
    eq(round.req.headers, r.headers) &&
    round.ok &&
    round.req.body.kind === "json",
  round,
);
const cmdRound = parseCurl(
  generate("curl", r, {
    ...OPT,
    env: false,
    curl: { shell: "cmd", multi: true, long: false },
  }).code,
);
check(
  "cmd output parses back",
  cmdRound.ok &&
    cmdRound.req.body.kind === "json" &&
    eq(cmdRound.req.headers, r.headers),
  cmdRound,
);
const psRound = parseCurl(
  generate("curl", r, {
    ...OPT,
    env: false,
    curl: { shell: "ps", multi: true, long: false },
  }).code,
);
check(
  "PowerShell output parses back",
  psRound.ok &&
    psRound.req.body.kind === "json" &&
    eq(psRound.req.headers, r.headers),
  psRound,
);
check(
  "@-text body uses --data-raw",
  generate(
    "curl",
    req("curl https://a.b -H 'Content-Type: text/plain' --data-raw '@me hi'"),
    OPT,
  ).code.includes("--data-raw"),
);

console.log("real-world gaps");
const dupQ = "curl 'https://a.b/s?tag=a&tag=b&q=1'";
check(
  "axios keeps repeated query names",
  gen("axios", dupQ).includes("params: new URLSearchParams([") &&
    gen("axios", dupQ).includes('["tag", "b"]'),
);
check(
  "python keeps repeated query names",
  gen("python", dupQ).includes(
    'params = [\n    ("tag", "a"),\n    ("tag", "b"),',
  ),
);
check(
  "php keeps repeated query names",
  gen("php", dupQ).includes("'query' => 'tag=a&tag=b&q=1'"),
);
const dupF = "curl https://a.b -d tag=a -d tag=b";
check(
  "fetch keeps repeated form names",
  gen("fetch", dupF).includes('["tag", "a"],\n    ["tag", "b"],'),
  gen("fetch", dupF),
);
check(
  "python keeps repeated form names",
  gen("python", dupF).includes('("tag", "b")'),
);
check(
  "php sends repeated form names as text",
  gen("php", dupF).includes("'body' => 'tag=a&tag=b'"),
);
check(
  "no repeats → plain object still",
  gen("fetch", "curl https://a.b -d a=1 -d b=2").includes(
    "body: new URLSearchParams({",
  ),
);
const pm = req(
  `curl --location 'https://a.b/up' --form 'file=@"/Users/me/My Photo.png";type=image/png'`,
);
check(
  "Postman quoted -F path",
  pm.body.kind === "multipart" &&
    pm.body.fields[0].file === "/Users/me/My Photo.png" &&
    pm.body.fields[0].type === "image/png",
  pm.body,
);
const sv = gen(
  "fetch",
  `curl https://a.b -H "Authorization: Bearer $GITHUB_TOKEN"`,
);
check(
  "shell variable read by its own name",
  sv.includes("`Bearer ${process.env.GITHUB_TOKEN}`"),
  sv,
);
check(
  "shell variable used even with env off",
  gen("python", `curl https://a.b -H 'X-Key: ${"${KEY}"}'`, {
    env: false,
  }).includes(`os.environ["KEY"]`),
);
check(
  "shell variable noted",
  req(`curl "https://a.b/$ORG"`).warnings.some((w) => w.text.includes("$ORG")),
);
check(
  "fetch notes browser-blocked headers",
  gen("fetch", "curl https://a.b -H 'Cookie: s=1'").includes(
    "Browsers won't let fetch send Cookie",
  ),
);
check(
  "valueless query kept as typed",
  gen("fetch", "curl 'https://a.b/x?debug&v=2'").includes(
    '"https://a.b/x?debug&v=2"',
  ),
);
check(
  "-d @file: no body text, still POST",
  (() => {
    const x = req("curl https://a.b -d @body.json");
    return (
      x.method === "POST" &&
      x.body.kind === "none" &&
      x.warnings.some((w) => w.text.includes("@body.json"))
    );
  })(),
);
check(
  "--data-raw @text is literal",
  req("curl https://a.b -H 'Content-Type: text/plain' --data-raw '@hello'").body
    .kind === "raw",
);
check(
  "--data-urlencode name@file is a file",
  req("curl https://a.b --data-urlencode 'msg@body.txt'").warnings.length > 0,
);
check(
  "--json @file: POST + warning",
  (() => {
    const x = req("curl https://a.b --json @d.json");
    return (
      x.method === "POST" &&
      x.body.kind === "none" &&
      x.warnings.some((w) => w.text.includes("--json @d.json"))
    );
  })(),
);
check(
  "Invoke-WebRequest explained",
  (() => {
    const x = parseCurl('Invoke-WebRequest -Uri "https://a.b"');
    return !x.ok && !x.empty && x.error.includes("PowerShell");
  })(),
);
check(
  "fetch() paste explained",
  (() => {
    const x = parseCurl('fetch("https://a.b", {})');
    return !x.ok && !x.empty && x.error.includes("fetch()");
  })(),
);
check(
  "Node note on uploads",
  gen("axios", "curl https://a.b -F f=@./a.png").includes("In Node 18+"),
);

console.log("form");
const built = requestFromForm(DEFAULT_FORM);
check(
  "default form builds",
  built.ok && built.req.method === "POST" && built.req.body.kind === "json",
);
check(
  "bearer → Authorization first",
  built.ok && built.req.headers[0][0] === "Authorization",
);
check(
  "bad JSON → error with position",
  (() => {
    const b = requestFromForm({ ...DEFAULT_FORM, json: '{"a":}' });
    return !b.ok && b.error.includes("position");
  })(),
);
const back = formFromRequest(req(SAMPLES.json.src));
check(
  "import: bearer extracted",
  back.authKind === "bearer" && back.token === "sk_test_51Hx9cAbCdEf",
);
check(
  "import: content-type not duplicated",
  !back.headers.some(([k]) => /content-type/i.test(k)),
);
const again = requestFromForm(back);
check(
  "form round-trip keeps request",
  again.ok &&
    eq(
      again.req.headers.map(([k]) => k.toLowerCase()).sort(),
      req(SAMPLES.json.src)
        .headers.map(([k]) => k.toLowerCase())
        .sort(),
    ),
);

console.log("highlight");
const hl = highlight('const a = "x"; // hi', "fetch");
check(
  "tones",
  hl[0].some((s) => s.tone === "keyword") &&
    hl[0].some((s) => s.tone === "string") &&
    hl[0].some((s) => s.tone === "comment"),
);
check(
  "curl flags",
  highlight("curl -H 'a: b' https://x", "curl")[0].some(
    (s) => s.tone === "flag" && s.t === "-H",
  ),
);

console.log("speed");
const huge = `curl https://a.b -H 'Content-Type: application/json' -d '${JSON.stringify({ rows: Array.from({ length: 5000 }, (_, i) => ({ id: i, name: `row ${i}`, ok: i % 2 === 0 })) })}'`;
let t0 = performance.now();
const hr = req(huge);
const parseMs = performance.now() - t0;
t0 = performance.now();
for (const lang of ["fetch", "axios", "python", "go", "php", "curl"] as const)
  generate(lang, hr, OPT);
const genMs = performance.now() - t0;
console.log(
  `    ${(huge.length / 1024).toFixed(0)} KB command: parse ${parseMs.toFixed(1)} ms, all 6 languages ${genMs.toFixed(1)} ms`,
);
check("~250 KB command parses under 50 ms", parseMs < 50);
t0 = performance.now();
for (let i = 0; i < 1000; i++) generate("fetch", req(SAMPLES.chrome.src), OPT);
const perKey = (performance.now() - t0) / 1000;
console.log(
  `    typical command, parse + generate: ${(perKey * 1000).toFixed(0)} µs`,
);
check("typical keystroke under 1 ms", perKey < 1);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
