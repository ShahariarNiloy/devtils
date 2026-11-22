/**
 * Request model → code: fetch, axios, Python requests, Go net/http, PHP
 * Guzzle, and curl itself (bash, cmd or PowerShell). Pure functions.
 *
 * `prepare` runs first and does the shared work once: drops browser-only
 * headers, merges repeated headers, and swaps secrets for environment
 * variables, so each generator only decides syntax.
 */

import {
  hasUnsafeNumber,
  jsonCompact,
  literal,
  JSON_STYLE,
  type JsonValue,
  type LiteralStyle,
} from "./curl-json.lib";
import {
  formEncode,
  type Body,
  type CurlRequest,
  type Pair,
} from "./curl-parse.lib";

export type Lang = "fetch" | "axios" | "python" | "go" | "php" | "curl";
export type Shell = "bash" | "cmd" | "ps";

export interface CurlStyle {
  shell: Shell;
  /** One flag per line. */
  multi: boolean;
  /** --header instead of -H. */
  long: boolean;
}

export interface GenOptions {
  /** Secrets become environment variables. */
  env: boolean;
  /** Leave out headers browsers add on their own. */
  dropNoise: boolean;
  curl: CurlStyle;
}

/* ------------------------------------------------------ secrets & noise */

/** Headers a browser adds on its own; APIs almost never need them. */
export const BROWSER_HEADER =
  /^(sec-ch-ua.*|sec-fetch-.*|sec-gpc|priority|dnt|upgrade-insecure-requests|accept-language|accept-encoding|cache-control|pragma|user-agent|connection|te)$/i;

export function isSecretHeader(name: string): boolean {
  return (
    /^(authorization|proxy-authorization|cookie|x-api-key|api-key|apikey|x-auth-token|x-access-token|x-csrf-token|x-xsrf-token)$/i.test(
      name,
    ) || /(token|secret|api[-_]?key|signature|password)/i.test(name)
  );
}

function envNameFor(header: string): string {
  const n = header
    .toUpperCase()
    .replace(/^X-/, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (n === "AUTHORIZATION") return "API_TOKEN";
  return /^\d/.test(n) ? `_${n}` : n || "SECRET";
}

/** `prefix$NAME` or `prefix${NAME}` at the end of a value. */
const SHELL_VAR = /^(.*?)\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))$/;

export interface PHeader {
  name: string;
  value: string;
  /** Set when the value is read from an environment variable. */
  secret?: { env: string; prefix: string };
}

export interface Prepared {
  method: string;
  url: string;
  query: Pair[];
  rawQuery: string | null;
  headers: PHeader[];
  body: Body;
  auth: { user: string; pass: string; env: string | null } | null;
  timeout: number | null;
  follow: boolean;
  insecure: boolean;
  compressed: boolean;
  silent: boolean;
  /** Header names left out as browser noise. */
  dropped: string[];
}

export function prepare(
  req: CurlRequest,
  o: Pick<GenOptions, "env" | "dropNoise">,
): Prepared {
  const dropped: string[] = [];
  // Merge repeats (case-insensitively) so object-literal targets don't
  // silently keep only the last one. Cookies join with "; ".
  const merged = new Map<string, [string, string]>();
  for (const [k, v] of req.headers) {
    if (o.dropNoise && BROWSER_HEADER.test(k)) {
      dropped.push(k);
      continue;
    }
    const key = k.toLowerCase();
    const prev = merged.get(key);
    if (prev) prev[1] = `${prev[1]}${key === "cookie" ? "; " : ", "}${v}`;
    else merged.set(key, [k, v]);
  }
  const used = new Set<string>();
  // Names the command already uses ($GITHUB_TOKEN) are taken first.
  for (const [, v] of merged.values()) {
    const m = SHELL_VAR.exec(v);
    if (m) used.add(m[2] ?? m[3]);
  }
  const unique = (name: string) => {
    let n = name;
    for (let i = 2; used.has(n); i++) n = `${name}_${i}`;
    used.add(n);
    return n;
  };
  const headers: PHeader[] = [...merged.values()].map(([name, value]) => {
    // "Bearer $GITHUB_TOKEN": the shell would have filled this in, so the
    // code reads the same variable — whatever the env switch says.
    const v = SHELL_VAR.exec(value);
    if (v) return { name, value, secret: { env: v[2] ?? v[3], prefix: v[1] } };
    if (!o.env || !value || !isSecretHeader(name)) return { name, value };
    const m = /^(Bearer|Basic|Token|Bot|Digest)\s+(.+)$/i.exec(value);
    return {
      name,
      value,
      secret: { env: unique(envNameFor(name)), prefix: m ? `${m[1]} ` : "" },
    };
  });
  const passVar = req.auth ? SHELL_VAR.exec(req.auth.pass) : null;
  let authEnv: string | null = null;
  if (passVar && !passVar[1]) authEnv = passVar[2] ?? passVar[3];
  else if (o.env && req.auth?.pass) authEnv = unique("API_PASSWORD");
  const auth = req.auth ? { ...req.auth, env: authEnv } : null;
  return {
    method: req.method,
    url: req.url,
    query: req.query,
    rawQuery: req.rawQuery,
    headers,
    body: req.body,
    auth,
    timeout: req.timeout,
    follow: req.follow,
    insecure: req.insecure,
    compressed: req.compressed,
    silent: req.silent,
    dropped,
  };
}

/* ------------------------------------------------------------- helpers */

const q = (s: string) => JSON.stringify(s);
/** PHP / Python single-quoted string. */
const sq = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const indent = (s: string, n: number) => s.replace(/\n/g, `\n${" ".repeat(n)}`);
const jsKey = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k));
const isCT = (h: PHeader) => /^content-type$/i.test(h.name);

export function fullUrl(
  p: Pick<Prepared, "url" | "query"> & { rawQuery?: string | null },
): string {
  if (p.rawQuery) return `${p.url}?${p.rawQuery}`;
  if (!p.query.length) return p.url;
  return `${p.url}?${p.query.map(([k, v]) => `${formEncode(k)}=${formEncode(v)}`).join("&")}`;
}

/** Response is read as JSON when the request asked for it or sent it. */
function wantsJson(p: Prepared): boolean {
  if (p.body.kind === "json") return true;
  const accept = p.headers.find((h) => /^accept$/i.test(h.name))?.value ?? "";
  return /json/i.test(accept);
}

const jsObject = (rows: [string, string][]) =>
  `{\n${rows.map(([k, v]) => `  ${jsKey(k)}: ${v},`).join("\n")}\n}`;

/** Some name appears twice (?tag=a&tag=b) — an object/dict would keep one. */
const repeats = (pairs: readonly Pair[]) =>
  new Set(pairs.map(([k]) => k)).size < pairs.length;

/** URLSearchParams init: an object, or [name, value] pairs when names repeat. */
function jsParams(pairs: readonly Pair[]): string {
  if (!repeats(pairs)) return jsObject(pairs.map(([k, v]) => [k, q(v)]));
  return `[\n${pairs.map(([k, v]) => `  [${q(k)}, ${q(v)}],`).join("\n")}\n]`;
}

/**
 * Headers browsers won't let fetch set, but Node 18+ sends. (Node rejects
 * Connection, Keep-Alive, Transfer-Encoding and Upgrade outright, so those
 * are left to the browser-header filter.)
 */
const FORBIDDEN =
  /^(cookie|cookie2|host|origin|referer|via|date|accept-charset|accept-encoding|sec-.*|proxy-.*)$/i;

const JS_STYLE: LiteralStyle = { ...JSON_STYLE, key: jsKey, trailing: true };
const PY_STYLE: LiteralStyle = {
  str: q,
  key: q,
  nul: "None",
  t: "True",
  f: "False",
  arr: ["[", "]"],
  obj: ["{", "}"],
  sep: ": ",
  indent: 4,
  trailing: true,
};
const PHP_STYLE: LiteralStyle = {
  str: sq,
  key: sq,
  nul: "null",
  t: "true",
  f: "false",
  arr: ["[", "]"],
  obj: ["[", "]"],
  sep: " => ",
  indent: 4,
  trailing: true,
};

const ms = (s: number) => Math.round(s * 1000);
const fileName = (path: string) => path.split(/[\\/]/).pop() || "file";

/* -------------------------------------------------------------- fetch */

function jsHeaderValue(h: PHeader): string {
  if (!h.secret) return q(h.value);
  return h.secret.prefix
    ? `\`${h.secret.prefix}\${process.env.${h.secret.env}}\``
    : `process.env.${h.secret.env}`;
}

/** Multipart setup shared by fetch and axios. */
function jsFormData(
  fields: Extract<Body, { kind: "multipart" }>["fields"],
): string[] {
  const out = ["const form = new FormData();"];
  if (fields.some((f) => f.file !== undefined))
    out.unshift(
      '// fileInput: an <input type="file"> on the page. In Node 18+, use',
      "// new Blob([await fs.readFile(path)]) from node:fs/promises instead.",
    );
  for (const f of fields) {
    out.push(
      f.file !== undefined
        ? `form.append(${q(f.name)}, fileInput.files[0]); // ${f.file}`
        : `form.append(${q(f.name)}, ${q(f.value)});`,
    );
  }
  out.push("");
  return out;
}

function genFetch(p: Prepared): string {
  const pre: string[] = [];
  const opts: string[] = [];
  const rows: [string, string][] = p.headers
    .filter((h) => !(p.body.kind === "multipart" && isCT(h)))
    .map((h) => [h.name, jsHeaderValue(h)]);
  if (p.auth) {
    const cred = p.auth.env
      ? `\`${p.auth.user}:\${process.env.${p.auth.env}}\``
      : q(`${p.auth.user}:${p.auth.pass}`);
    rows.push(["Authorization", `"Basic " + btoa(${cred})`]);
  }
  if (p.method !== "GET") opts.push(`method: ${q(p.method)}`);
  if (rows.length) opts.push(`headers: ${indent(jsObject(rows), 2)}`);
  const blocked = p.headers
    .filter((h) => FORBIDDEN.test(h.name))
    .map((h) => h.name);
  if (blocked.length)
    pre.push(
      `// Browsers won't let fetch send ${blocked.join(", ")}; ${blocked.length > 1 ? "they work" : "it works"} in Node 18+.`,
    );
  const b = p.body;
  if (b.kind === "json") {
    if (hasUnsafeNumber(b.value)) {
      pre.push(
        "// Sent as text: a number in the body is too large for a JS number.",
      );
      opts.push(`body: ${q(jsonCompact(b.value))}`);
    } else
      opts.push(
        `body: JSON.stringify(${indent(literal(b.value, JS_STYLE), 2)})`,
      );
  } else if (b.kind === "form")
    opts.push(`body: new URLSearchParams(${indent(jsParams(b.fields), 2)})`);
  else if (b.kind === "raw") opts.push(`body: ${q(b.raw)}`);
  else if (b.kind === "multipart") {
    pre.push(...jsFormData(b.fields));
    opts.push("body: form");
  }
  if (p.timeout) opts.push(`signal: AbortSignal.timeout(${ms(p.timeout)})`);
  const call = `const res = await fetch(${q(fullUrl(p))}${opts.length ? `, {\n  ${opts.join(",\n  ")},\n}` : ""});`;
  const read =
    p.method === "HEAD"
      ? "console.log(Object.fromEntries(res.headers));"
      : `const data = await res.${wantsJson(p) ? "json" : "text"}();`;
  return [
    ...pre,
    call,
    "",
    "if (!res.ok) throw new Error(`HTTP ${res.status}`);",
    read,
  ].join("\n");
}

/* -------------------------------------------------------------- axios */

function genAxios(p: Prepared): string {
  const pre = ['import axios from "axios";', ""];
  const o = [`method: ${q(p.method.toLowerCase())}`, `url: ${q(p.url)}`];
  if (p.query.length)
    o.push(
      `params: ${repeats(p.query) ? `new URLSearchParams(${indent(jsParams(p.query), 2)})` : indent(jsParams(p.query), 2)}`,
    );
  const b = p.body;
  const unsafe = b.kind === "json" && hasUnsafeNumber(b.value);
  const hs = p.headers.filter(
    (h) =>
      !(b.kind === "multipart" && isCT(h)) &&
      !(
        b.kind === "json" &&
        !unsafe &&
        isCT(h) &&
        /^application\/json\b/i.test(h.value)
      ),
  );
  if (hs.length)
    o.push(
      `headers: ${indent(jsObject(hs.map((h) => [h.name, jsHeaderValue(h)])), 2)}`,
    );
  if (p.auth)
    o.push(
      `auth: { username: ${q(p.auth.user)}, password: ${p.auth.env ? `process.env.${p.auth.env}` : q(p.auth.pass)} }`,
    );
  if (b.kind === "json") {
    if (unsafe) {
      pre.push(
        "// Sent as text: a number in the body is too large for a JS number.",
      );
      o.push(`data: ${q(jsonCompact(b.value))}`);
    } else o.push(`data: ${indent(literal(b.value, JS_STYLE), 2)}`);
  } else if (b.kind === "form")
    o.push(`data: new URLSearchParams(${indent(jsParams(b.fields), 2)})`);
  else if (b.kind === "raw") o.push(`data: ${q(b.raw)}`);
  else if (b.kind === "multipart") {
    pre.push(...jsFormData(b.fields));
    o.push("data: form");
  }
  if (p.timeout) o.push(`timeout: ${ms(p.timeout)}`);
  const call = `const { ${p.method === "HEAD" ? "headers" : "data"} } = await axios({\n  ${o.join(",\n  ")},\n});`;
  return [...pre, call].join("\n");
}

/* ------------------------------------------------------------- Python */

function genPython(p: Prepared): string {
  let needOs = false;
  const hv = (h: PHeader) => {
    if (!h.secret) return q(h.value);
    needOs = true;
    return h.secret.prefix
      ? `f${q(`${h.secret.prefix}{os.environ['${h.secret.env}']}`)}`
      : `os.environ[${q(h.secret.env)}]`;
  };
  const dict = (rows: [string, string][]) =>
    `{\n${rows.map(([k, v]) => `    ${q(k)}: ${v},`).join("\n")}\n}`;
  /** requests takes a list of (name, value) tuples when names repeat. */
  const pairs = (rows: readonly Pair[]) =>
    repeats(rows)
      ? `[\n${rows.map(([k, v]) => `    (${q(k)}, ${q(v)}),`).join("\n")}\n]`
      : dict(rows.map(([k, v]) => [k, q(v)]));
  const args = [q(p.url)];
  const blocks: string[] = [];
  if (p.query.length) {
    blocks.push(`params = ${pairs(p.query)}`);
    args.push("params=params");
  }
  const b = p.body;
  const jsonBody = b.kind === "json" && !hasUnsafeNumber(b.value, true);
  const hs = p.headers.filter(
    (h) =>
      !(b.kind === "multipart" && isCT(h)) &&
      !(jsonBody && isCT(h) && /^application\/json\b/i.test(h.value)),
  );
  if (hs.length) {
    blocks.push(`headers = ${dict(hs.map((h) => [h.name, hv(h)]))}`);
    args.push("headers=headers");
  }
  if (b.kind === "json") {
    if (jsonBody) {
      blocks.push(`payload = ${literal(b.value, PY_STYLE)}`);
      args.push("json=payload");
    } else {
      blocks.push(
        `# Sent as text so no decimal loses digits.\ndata = ${q(jsonCompact(b.value))}`,
      );
      args.push("data=data");
    }
  } else if (b.kind === "form") {
    blocks.push(`data = ${pairs(b.fields)}`);
    args.push("data=data");
  } else if (b.kind === "raw") {
    blocks.push(`data = ${q(b.raw)}`);
    args.push("data=data");
  } else if (b.kind === "multipart") {
    const files = b.fields.filter((f) => f.file !== undefined);
    const plain = b.fields.filter((f) => f.file === undefined);
    if (files.length) {
      blocks.push(
        `files = {\n${files
          .map(
            (f) =>
              `    ${q(f.name)}: ${f.type ? `(${q(fileName(f.file ?? ""))}, open(${q(f.file ?? "")}, "rb"), ${q(f.type)})` : `open(${q(f.file ?? "")}, "rb")`},`,
          )
          .join("\n")}\n}`,
      );
      args.push("files=files");
    }
    if (plain.length) {
      blocks.push(
        `data = ${pairs(plain.map((f) => [f.name, f.value] as const))}`,
      );
      args.push("data=data");
    }
  }
  if (p.auth) {
    if (p.auth.env) needOs = true;
    args.push(
      `auth=(${q(p.auth.user)}, ${p.auth.env ? `os.environ[${q(p.auth.env)}]` : q(p.auth.pass)})`,
    );
  }
  if (p.timeout) args.push(`timeout=${p.timeout}`);
  if (p.method === "HEAD" && p.follow) args.push("allow_redirects=True");
  const m = p.method.toLowerCase();
  const fn = /^(get|post|put|patch|delete|head|options)$/.test(m)
    ? `requests.${m}(`
    : `requests.request(${q(p.method)}, `;
  const call = `response = ${fn}${args.length > 2 ? `\n    ${args.join(",\n    ")},\n)` : `${args.join(", ")})`}`;
  let read = "print(response.text)";
  if (p.method === "HEAD") read = "print(response.headers)";
  else if (wantsJson(p)) read = "data = response.json()";
  const imports = needOs ? "import os\n\nimport requests" : "import requests";
  return `${imports}\n\n${blocks.length ? `${blocks.join("\n\n")}\n\n` : ""}${call}\nresponse.raise_for_status()\n${read}`;
}

/* ----------------------------------------------------------------- Go */

/** Go string literal: raw string when it has newlines and no backtick. */
function goStr(s: string): string {
  return s.includes("\n") && !s.includes("`") ? `\`${s}\`` : q(s);
}

function goRawBlock(s: string): string {
  return `\`${s.replace(/`/g, '` + "`" + `')}\``;
}

function genGo(p: Prepared): string {
  const imp = new Set(['"fmt"', '"io"', '"net/http"']);
  const pre: string[] = [];
  let bodyVar = "nil";
  const check = "if err != nil {\n\tpanic(err)\n}";
  const b = p.body;
  if (b.kind === "json") {
    imp.add('"strings"');
    pre.push(
      `body := strings.NewReader(${goRawBlock(literal(b.value, JSON_STYLE))})`,
    );
    bodyVar = "body";
  } else if (b.kind === "form") {
    imp.add('"net/url"').add('"strings"');
    pre.push("form := url.Values{}");
    for (const [k, v] of b.fields) pre.push(`form.Add(${q(k)}, ${q(v)})`);
    pre.push("body := strings.NewReader(form.Encode())");
    bodyVar = "body";
  } else if (b.kind === "raw") {
    imp.add('"strings"');
    pre.push(`body := strings.NewReader(${goStr(b.raw)})`);
    bodyVar = "body";
  } else if (b.kind === "multipart") {
    imp.add('"bytes"').add('"mime/multipart"');
    pre.push("var buf bytes.Buffer", "mw := multipart.NewWriter(&buf)");
    let n = 0;
    for (const f of b.fields) {
      if (f.file !== undefined) {
        imp.add('"os"');
        n++;
        const fv = `file${n}`;
        const pv = `part${n}`;
        pre.push(
          `${fv}, err := os.Open(${q(f.file)})`,
          check,
          `defer ${fv}.Close()`,
          `${pv}, err := mw.CreateFormFile(${q(f.name)}, ${q(fileName(f.file))})`,
          check,
          `if _, err := io.Copy(${pv}, ${fv}); err != nil {\n\tpanic(err)\n}`,
        );
      } else pre.push(`mw.WriteField(${q(f.name)}, ${q(f.value)})`);
    }
    pre.push("mw.Close()");
    bodyVar = "&buf";
  }
  const L = [
    ...pre,
    `req, err := http.NewRequest(${q(p.method)}, ${q(fullUrl(p))}, ${bodyVar})`,
    check,
  ];
  for (const h of p.headers) {
    if (b.kind === "multipart" && isCT(h)) continue;
    if (h.secret) {
      imp.add('"os"');
      L.push(
        `req.Header.Set(${q(h.name)}, ${h.secret.prefix ? `${q(h.secret.prefix)}+` : ""}os.Getenv(${q(h.secret.env)}))`,
      );
    } else L.push(`req.Header.Set(${q(h.name)}, ${q(h.value)})`);
  }
  if (b.kind === "multipart")
    L.push('req.Header.Set("Content-Type", mw.FormDataContentType())');
  if (p.auth) {
    if (p.auth.env) imp.add('"os"');
    L.push(
      `req.SetBasicAuth(${q(p.auth.user)}, ${p.auth.env ? `os.Getenv(${q(p.auth.env)})` : q(p.auth.pass)})`,
    );
  }
  let client = "client := &http.Client{}";
  if (p.timeout) {
    imp.add('"time"');
    client = Number.isInteger(p.timeout)
      ? `client := &http.Client{Timeout: ${p.timeout} * time.Second}`
      : `client := &http.Client{Timeout: ${ms(p.timeout)} * time.Millisecond}`;
  }
  L.push(
    "",
    client,
    "resp, err := client.Do(req)",
    check,
    "defer resp.Body.Close()",
    "",
    "data, err := io.ReadAll(resp.Body)",
    check,
    "fmt.Println(resp.Status)",
    "fmt.Println(string(data))",
  );
  const body = L.join("\n")
    .split("\n")
    .map((l) => (l ? `\t${l}` : l))
    .join("\n");
  return `package main\n\nimport (\n\t${[...imp].sort().join("\n\t")}\n)\n\nfunc main() {\n${body}\n}`;
}

/* ---------------------------------------------------------------- PHP */

function genPhp(p: Prepared): string {
  const o: string[] = [];
  const hv = (h: PHeader) => {
    if (!h.secret) return sq(h.value);
    return h.secret.prefix
      ? `${sq(h.secret.prefix)} . getenv(${sq(h.secret.env)})`
      : `getenv(${sq(h.secret.env)})`;
  };
  const arr = (rows: [string, string][]) =>
    `[\n${rows.map(([k, v]) => `        ${sq(k)} => ${v},`).join("\n")}\n    ]`;
  if (p.query.length)
    o.push(
      repeats(p.query)
        ? `'query' => ${sq(fullUrl({ url: "", query: p.query }).slice(1))}`
        : `'query' => ${arr(p.query.map(([k, v]) => [k, sq(v)]))}`,
    );
  const b = p.body;
  const jsonOpt = b.kind === "json" && !hasUnsafeNumber(b.value);
  const hs = p.headers.filter(
    (h) => !(b.kind === "multipart" && isCT(h)) && !(jsonOpt && isCT(h)),
  );
  if (hs.length) o.push(`'headers' => ${arr(hs.map((h) => [h.name, hv(h)]))}`);
  if (p.auth)
    o.push(
      `'auth' => [${sq(p.auth.user)}, ${p.auth.env ? `getenv(${sq(p.auth.env)})` : sq(p.auth.pass)}]`,
    );
  if (b.kind === "json") {
    o.push(
      jsonOpt
        ? `'json' => ${indent(literal(b.value, PHP_STYLE), 4)}`
        : `'body' => ${sq(jsonCompact(b.value))}`,
    );
  } else if (b.kind === "form")
    o.push(
      // Guzzle's form_params can't repeat a name; send the encoded text.
      repeats(b.fields)
        ? `'body' => ${sq(fullUrl({ url: "", query: b.fields }).slice(1))}`
        : `'form_params' => ${arr(b.fields.map(([k, v]) => [k, sq(v)]))}`,
    );
  else if (b.kind === "raw") o.push(`'body' => ${sq(b.raw)}`);
  else if (b.kind === "multipart") {
    o.push(
      `'multipart' => [\n${b.fields
        .map(
          (f) =>
            `        ['name' => ${sq(f.name)}, 'contents' => ${f.file !== undefined ? `fopen(${sq(f.file)}, 'r')` : sq(f.value)}],`,
        )
        .join("\n")}\n    ]`,
    );
  }
  if (p.timeout) o.push(`'timeout' => ${p.timeout}`);
  const opts = o.length ? `, [\n    ${o.join(",\n    ")},\n]` : "";
  const read =
    p.method === "HEAD"
      ? "print_r($response->getHeaders());"
      : "echo $response->getBody();";
  return `<?php\nrequire 'vendor/autoload.php';\n\n$client = new GuzzleHttp\\Client();\n\n$response = $client->request(${sq(p.method)}, ${sq(p.url)}${opts});\n\n${read}`;
}

/* --------------------------------------------------------------- curl */

function genCurl(p: Prepared, o: CurlStyle): string {
  const { shell, long, multi } = o;
  const ENV_REF: Record<Shell, (n: string) => string> = {
    bash: (n) => `$${n}`,
    cmd: (n) => `%${n}%`,
    ps: (n) => `$env:${n}`,
  };
  const envRef = ENV_REF[shell];
  const quote = (s: string): string => {
    if (shell === "cmd")
      return `"${s.replace(/(\\*)"/g, (_, bs: string) => `${bs}${bs}\\"`).replace(/(\\+)$/, "$1$1")}"`;
    if (shell === "ps") return `'${s.replace(/'/g, "''")}'`;
    return /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`;
  };
  /** A value with an env reference must be double-quoted to expand. */
  const withEnv = (prefix: string, env: string) => {
    if (shell === "cmd") return `"${prefix}${envRef(env)}"`;
    if (shell === "ps")
      return `"${prefix.replace(/[`"$]/g, "`$&")}${envRef(env)}"`;
    return `"${prefix.replace(/["\\$`]/g, "\\$&")}${envRef(env)}"`;
  };
  const F = long
    ? {
        X: "--request",
        H: "--header",
        d: "--data",
        raw: "--data-raw",
        F: "--form",
        u: "--user",
        L: "--location",
        k: "--insecure",
        m: "--max-time",
        s: "--silent",
      }
    : {
        X: "-X",
        H: "-H",
        d: "-d",
        raw: "--data-raw",
        F: "-F",
        u: "-u",
        L: "-L",
        k: "-k",
        m: "-m",
        s: "-s",
      };
  const parts: string[] = [quote(fullUrl(p))];
  const b = p.body;
  const defaultMethod = b.kind === "none" ? "GET" : "POST";
  if (p.method === "HEAD" && b.kind === "none")
    parts.push(long ? "--head" : "-I");
  else if (p.method !== defaultMethod) parts.push(`${F.X} ${p.method}`);
  for (const h of p.headers) {
    if (b.kind === "multipart" && isCT(h)) continue;
    parts.push(
      `${F.H} ${h.secret ? withEnv(`${h.name}: ${h.secret.prefix}`, h.secret.env) : quote(`${h.name}: ${h.value}`)}`,
    );
  }
  if (p.auth)
    parts.push(
      `${F.u} ${p.auth.env ? withEnv(`${p.auth.user}:`, p.auth.env) : quote(`${p.auth.user}:${p.auth.pass}`)}`,
    );
  // --data-raw when the text starts with @, so curl doesn't read a file.
  const dataFlag = (s: string) => (s.startsWith("@") ? F.raw : F.d);
  if (b.kind === "json") {
    const s = jsonCompact(b.value);
    parts.push(`${dataFlag(s)} ${quote(s)}`);
  } else if (b.kind === "form") {
    for (const [k, v] of b.fields)
      parts.push(`${F.d} ${quote(`${formEncode(k)}=${formEncode(v)}`)}`);
  } else if (b.kind === "raw") parts.push(`${dataFlag(b.raw)} ${quote(b.raw)}`);
  else if (b.kind === "multipart") {
    for (const f of b.fields) {
      const v =
        f.file !== undefined
          ? `@${f.file}${f.type ? `;type=${f.type}` : ""}`
          : f.value;
      parts.push(
        `${f.file === undefined && /^[@<]/.test(f.value) ? "--form-string" : F.F} ${quote(`${f.name}=${v}`)}`,
      );
    }
  }
  if (p.follow) parts.push(F.L);
  if (p.compressed) parts.push("--compressed");
  if (p.insecure) parts.push(F.k);
  if (p.silent) parts.push(F.s);
  if (p.timeout) parts.push(`${F.m} ${p.timeout}`);
  const bin = shell === "ps" ? "curl.exe" : "curl";
  if (!multi || parts.length === 1) return `${bin} ${parts.join(" ")}`;
  const cont = { bash: " \\", cmd: " ^", ps: " `" }[shell];
  return `${bin} ${parts[0]}${cont}\n  ${parts.slice(1).join(`${cont}\n  `)}`;
}

/* ---------------------------------------------------------------- api */

const GEN: Record<Exclude<Lang, "curl">, (p: Prepared) => string> = {
  fetch: genFetch,
  axios: genAxios,
  python: genPython,
  go: genGo,
  php: genPhp,
};

export interface Generated {
  code: string;
  prepared: Prepared;
}

export function generate(
  lang: Lang,
  req: CurlRequest,
  o: GenOptions,
): Generated {
  const prepared = prepare(req, o);
  const code =
    lang === "curl" ? genCurl(prepared, o.curl) : GEN[lang](prepared);
  return { code, prepared };
}

/** Exposed for tests. */
export const __test = {
  genCurl,
  jsonBody: (v: JsonValue) => literal(v, JS_STYLE),
};
