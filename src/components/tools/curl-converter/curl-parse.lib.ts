/**
 * curl command → request model. Pure: no DOM, no React.
 *
 * The model is what every generator reads, and what the generator form
 * edits, so "paste a command" and "build one" share one code path.
 */

import { JsonSyntaxError, parseJson, type JsonValue } from "./curl-json.lib";
import { tokenize } from "./curl-tokenize.lib";

export type Pair = readonly [string, string];

export interface MultipartField {
  name: string;
  /** Text value (empty for a file). */
  value: string;
  /** Path after `@`, when this field uploads a file. */
  file?: string;
  /** `;type=` given with the file. */
  type?: string;
}

export type Body =
  | { kind: "none" }
  | { kind: "json"; raw: string; value: JsonValue }
  | { kind: "form"; fields: Pair[] }
  | { kind: "multipart"; fields: MultipartField[] }
  | { kind: "raw"; raw: string; type: string };

export type BodyKind = Body["kind"];

export interface Warning {
  level: "warn" | "info";
  text: string;
}

export interface CurlRequest {
  method: string;
  /** Without query string or fragment. */
  url: string;
  origin: string;
  path: string;
  query: Pair[];
  /**
   * The URL's query exactly as typed (keeps `?debug` without `=`), or null
   * when -G / --url-query added parameters and it has to be rebuilt.
   */
  rawQuery: string | null;
  headers: Pair[];
  body: Body;
  auth: { user: string; pass: string } | null;
  follow: boolean;
  insecure: boolean;
  compressed: boolean;
  silent: boolean;
  /** Seconds (`-m`), or null. */
  timeout: number | null;
  warnings: Warning[];
}

export type ParseResult =
  | { ok: true; req: CurlRequest }
  | { ok: false; empty: true }
  | { ok: false; empty: false; error: string };

/* ---------------------------------------------------------------- flags */

type Flag =
  | "X"
  | "H"
  | "d"
  | "draw"
  | "durl"
  | "json"
  | "F"
  | "Fs"
  | "u"
  | "b"
  | "A"
  | "e"
  | "G"
  | "I"
  | "L"
  | "k"
  | "compressed"
  | "url"
  | "urlq"
  | "m"
  | "ct"
  | "x"
  | "o"
  | "s"
  | "bearer"
  | "c"
  | "T"
  | "skip"
  | "skipArg";

const LONG: Record<string, Flag> = {
  request: "X",
  header: "H",
  data: "d",
  "data-raw": "draw",
  "data-ascii": "d",
  "data-binary": "d",
  "data-urlencode": "durl",
  json: "json",
  form: "F",
  "form-string": "Fs",
  user: "u",
  cookie: "b",
  "user-agent": "A",
  referer: "e",
  get: "G",
  head: "I",
  location: "L",
  "location-trusted": "L",
  insecure: "k",
  compressed: "compressed",
  url: "url",
  "url-query": "urlq",
  "max-time": "m",
  "connect-timeout": "ct",
  proxy: "x",
  output: "o",
  silent: "s",
  "oauth2-bearer": "bearer",
  "cookie-jar": "c",
  "upload-file": "T",
  // Flags with a value we don't translate — read the value so it isn't
  // taken for the URL.
  cacert: "skipArg",
  capath: "skipArg",
  cert: "skipArg",
  key: "skipArg",
  "cert-type": "skipArg",
  "key-type": "skipArg",
  pass: "skipArg",
  ciphers: "skipArg",
  resolve: "skipArg",
  "connect-to": "skipArg",
  interface: "skipArg",
  "limit-rate": "skipArg",
  "write-out": "skipArg",
  range: "skipArg",
  "time-cond": "skipArg",
  config: "skipArg",
  "max-redirs": "skipArg",
  retry: "skipArg",
  "retry-delay": "skipArg",
  "retry-max-time": "skipArg",
  "keepalive-time": "skipArg",
  "expect100-timeout": "skipArg",
  "unix-socket": "skipArg",
  "abstract-unix-socket": "skipArg",
  noproxy: "skipArg",
  "proxy-user": "skipArg",
  "tls-max": "skipArg",
  "continue-at": "skipArg",
  "dump-header": "skipArg",
  trace: "skipArg",
  "trace-ascii": "skipArg",
  "speed-limit": "skipArg",
  "speed-time": "skipArg",
  "max-filesize": "skipArg",
  "local-port": "skipArg",
  "dns-servers": "skipArg",
  variable: "skipArg",
  "aws-sigv4": "skipArg",
  proto: "skipArg",
  "proto-redir": "skipArg",
  "happy-eyeballs-timeout-ms": "skipArg",
  "parallel-max": "skipArg",
  rate: "skipArg",
  stderr: "skipArg",
  "netrc-file": "skipArg",
  socks5: "skipArg",
  "socks5-hostname": "skipArg",
  preproxy: "skipArg",
  // Switches that change nothing in the generated code.
  "show-error": "skip",
  verbose: "skip",
  include: "skip",
  fail: "skip",
  "fail-with-body": "skip",
  http2: "skip",
  "http1.1": "skip",
  "http1.0": "skip",
  "http2-prior-knowledge": "skip",
  http3: "skip",
  "no-buffer": "skip",
  "no-keepalive": "skip",
  "tcp-nodelay": "skip",
  "path-as-is": "skip",
  globoff: "skip",
  "remote-name": "skip",
  "remote-header-name": "skip",
  "create-dirs": "skip",
  progress: "skip",
  "progress-bar": "skip",
  ipv4: "skip",
  ipv6: "skip",
  tlsv1: "skip",
  "tlsv1.2": "skip",
  "tlsv1.3": "skip",
  "ssl-no-revoke": "skip",
  "retry-all-errors": "skip",
  "retry-connrefused": "skip",
  raw: "skip",
  "no-progress-meter": "skip",
  "styled-output": "skip",
  "no-styled-output": "skip",
  disable: "skip",
  digest: "skip",
  basic: "skip",
  ntlm: "skip",
  anyauth: "skip",
  negotiate: "skip",
  netrc: "skip",
  "netrc-optional": "skip",
  parallel: "skip",
};

const TAKES_VALUE = new Set<Flag>([
  "X",
  "H",
  "d",
  "draw",
  "durl",
  "json",
  "F",
  "Fs",
  "u",
  "b",
  "A",
  "e",
  "url",
  "urlq",
  "m",
  "ct",
  "x",
  "o",
  "bearer",
  "c",
  "T",
  "skipArg",
]);

const SHORT: Record<string, Flag> = {
  X: "X",
  H: "H",
  d: "d",
  F: "F",
  u: "u",
  b: "b",
  A: "A",
  e: "e",
  G: "G",
  I: "I",
  L: "L",
  k: "k",
  m: "m",
  x: "x",
  o: "o",
  s: "s",
  c: "c",
  T: "T",
  S: "skip",
  v: "skip",
  i: "skip",
  f: "skip",
  O: "skip",
  J: "skip",
  N: "skip",
  "#": "skip",
  "0": "skip",
  "4": "skip",
  "6": "skip",
  "1": "skip",
  "2": "skip",
  "3": "skip",
  g: "skip",
  n: "skip",
  E: "skipArg",
  K: "skipArg",
  r: "skipArg",
  w: "skipArg",
  z: "skipArg",
  C: "skipArg",
  Y: "skipArg",
  y: "skipArg",
  U: "skipArg",
  D: "skipArg",
  t: "skipArg",
  Q: "skipArg",
  P: "skipArg",
};

/* ---------------------------------------------------------------- helpers */

export const formEncode = (s: string) =>
  encodeURIComponent(s).replace(/%20/g, "+");

const formDecode = (s: string) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
};

const pctDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function splitForm(raw: string): Pair[] {
  return raw
    .split("&")
    .filter(Boolean)
    .map((kv) => {
      const ix = kv.indexOf("=");
      return [
        formDecode(ix < 0 ? kv : kv.slice(0, ix)),
        ix < 0 ? "" : formDecode(kv.slice(ix + 1)),
      ] as const;
    });
}

export const headerGet = (h: readonly Pair[], name: string) =>
  h.find((x) => x[0].toLowerCase() === name)?.[1] ?? null;
const headerDel = (h: Pair[], name: string) =>
  h.filter((x) => x[0].toLowerCase() !== name);

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/* ---------------------------------------------------------------- parse */

interface Raw {
  method: string | null;
  url: string;
  urlQuery: string[];
  headers: Pair[];
  /** -d parts; `file` when curl would read the value from a file (@path). */
  data: { v: string; file: boolean }[];
  json: string | null;
  form: { raw: string; literal: boolean }[];
  user: string | null;
  cookies: string[];
  get: boolean;
  head: boolean;
  follow: boolean;
  insecure: boolean;
  compressed: boolean;
  silent: boolean;
  timeout: number | null;
  connectTimeout: number | null;
  proxy: string | null;
  output: string | null;
  upload: string | null;
  cookieJar: boolean;
  unknown: string[];
}

export function parseCurl(src: string): ParseResult {
  const toks = tokenize(src.trim());
  if (!toks.length) return { ok: false, empty: true };
  if (!/^curl(\.exe)?$/i.test(toks[0])) {
    return { ok: false, empty: false, error: notCurl(src.trim(), toks[0]) };
  }
  const R: Raw = {
    method: null,
    url: "",
    urlQuery: [],
    headers: [],
    data: [],
    json: null,
    form: [],
    user: null,
    cookies: [],
    get: false,
    head: false,
    follow: false,
    insecure: false,
    compressed: false,
    silent: false,
    timeout: null,
    connectTimeout: null,
    proxy: null,
    output: null,
    upload: null,
    cookieJar: false,
    unknown: [],
  };

  const apply = (k: Flag, v: string) => {
    switch (k) {
      case "X":
        R.method = v.toUpperCase();
        break;
      case "H": {
        const ix = v.indexOf(":");
        if (ix > 0)
          R.headers.push([v.slice(0, ix).trim(), v.slice(ix + 1).trim()]);
        // "Name;" sends the header with an empty value.
        else if (v.endsWith(";")) R.headers.push([v.slice(0, -1).trim(), ""]);
        break;
      }
      case "d":
        // -d @path (and --data-binary @path) read the body from a file.
        R.data.push({ v, file: v.startsWith("@") });
        break;
      case "draw":
        R.data.push({ v, file: false });
        break;
      case "durl": {
        // content | =content | name=content | @file | name@file (curl's rules).
        const ix = v.indexOf("=");
        if (ix < 0 && v.includes("@")) R.data.push({ v, file: true });
        else if (ix < 0) R.data.push({ v: formEncode(v), file: false });
        else
          R.data.push({
            v:
              (ix > 0 ? `${v.slice(0, ix)}=` : "") +
              formEncode(v.slice(ix + 1)),
            file: false,
          });
        break;
      }
      case "json":
        R.json = (R.json ?? "") + v;
        break;
      case "F":
      case "Fs":
        R.form.push({ raw: v, literal: k === "Fs" });
        break;
      case "u":
        R.user = v;
        break;
      case "b":
        R.cookies.push(v);
        break;
      case "A":
        R.headers.push(["User-Agent", v]);
        break;
      case "e":
        R.headers.push(["Referer", v]);
        break;
      case "G":
        R.get = true;
        break;
      case "I":
        R.head = true;
        break;
      case "L":
        R.follow = true;
        break;
      case "k":
        R.insecure = true;
        break;
      case "compressed":
        R.compressed = true;
        break;
      case "s":
        R.silent = true;
        break;
      case "url":
        if (!R.url) R.url = v;
        break;
      case "urlq":
        R.urlQuery.push(v);
        break;
      case "m":
        R.timeout = positive(v);
        break;
      case "ct":
        R.connectTimeout = positive(v);
        break;
      case "x":
        R.proxy = v;
        break;
      case "o":
        R.output = v;
        break;
      case "bearer":
        R.headers.push(["Authorization", `Bearer ${v}`]);
        break;
      case "c":
        R.cookieJar = true;
        break;
      case "T":
        R.upload = v;
        break;
      case "skip":
      case "skipArg":
        break;
    }
  };

  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    if (t === "") continue;
    if (t === "--") {
      // Everything after -- is a URL.
      for (const rest of toks.slice(i + 1)) if (!R.url) R.url = rest;
      break;
    }
    if (t.startsWith("--")) {
      let name = t.slice(2);
      let val: string | null = null;
      const eq = name.indexOf("=");
      if (
        eq > 0 &&
        LONG[name.slice(0, eq)] &&
        TAKES_VALUE.has(LONG[name.slice(0, eq)])
      ) {
        val = name.slice(eq + 1);
        name = name.slice(0, eq);
      }
      // --no-xxx turns a switch off; nothing we model needs it.
      const k =
        LONG[name] ??
        (name.startsWith("no-") && LONG[name.slice(3)] ? "skip" : undefined);
      if (!k) {
        R.unknown.push(t);
        continue;
      }
      if (TAKES_VALUE.has(k)) {
        if (val === null) val = toks[++i] ?? "";
        apply(k, val);
      } else apply(k, "");
      continue;
    }
    if (t[0] === "-" && t.length > 1) {
      for (let j = 1; j < t.length; j++) {
        const k = SHORT[t[j]];
        if (!k) {
          R.unknown.push(`-${t[j]}`);
          continue;
        }
        if (TAKES_VALUE.has(k)) {
          const rest = t.slice(j + 1);
          apply(k, rest || (toks[++i] ?? ""));
          break;
        }
        apply(k, "");
      }
      continue;
    }
    if (!R.url) R.url = t;
    else R.unknown.push(t);
  }

  if (!R.url)
    return {
      ok: false,
      empty: false,
      error:
        "No URL found. Add one after curl, for example curl https://api.example.com/users",
    };
  return build(R);
}

/** What curl sends when there's no -X. */
function defaultMethod(
  head: boolean,
  upload: boolean,
  hasBody: boolean,
): string {
  if (head) return "HEAD";
  if (upload) return "PUT";
  return hasBody ? "POST" : "GET";
}

/**
 * `-F name=@"My File.png";type=image/png` → path and type. curl allows the
 * path (and options) in double quotes, which Postman always writes.
 */
function formFile(spec: string): { path: string; type?: string } {
  const parts: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < spec.length; i++) {
    const c = spec[i];
    if (quoted && c === "\\" && i + 1 < spec.length) {
      cur += spec[++i];
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === ";" && !quoted) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  const type = parts
    .slice(1)
    .find((o) => o.trim().startsWith("type="))
    ?.trim()
    .slice(5);
  return { path: parts[0], ...(type ? { type } : {}) };
}

const VAR_RE = /\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/g;

/** $NAME / ${NAME} anywhere a shell would have expanded them. */
function shellVariables(R: Raw): string[] {
  const seen = new Set<string>();
  const scan = (s: string | null) => {
    if (!s) return;
    for (const m of s.matchAll(VAR_RE)) seen.add(m[1] ?? m[2]);
  };
  scan(R.url);
  scan(R.user);
  scan(R.json);
  for (const [, v] of R.headers) scan(v);
  for (const d of R.data) scan(d.v);
  return [...seen];
}

/** A helpful error for things people paste that aren't curl. */
function notCurl(src: string, first: string): string {
  if (/^Invoke-(WebRequest|RestMethod)$/i.test(first)) {
    return "This is a PowerShell Invoke-WebRequest command. In DevTools, use Copy → Copy as cURL (bash) or (cmd) instead.";
  }
  if (/^(await\s+)?fetch\s*\(/.test(src)) {
    return "This is a fetch() call. In DevTools, use Copy → Copy as cURL instead, then paste that here.";
  }
  if (/^(wget|http|https)$/i.test(first)) {
    return `This is a ${first} command, not curl. Paste a curl command, like curl https://api.example.com`;
  }
  return "This doesn't start with curl. Paste a full command, like curl https://api.example.com";
}

function positive(v: string): number | null {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function build(R: Raw): ParseResult {
  const warnings: Warning[] = [];
  const warn = (text: string) => warnings.push({ level: "warn", text });
  const info = (text: string) => warnings.push({ level: "info", text });
  let headers = R.headers.slice();
  let body: Body = { kind: "none" };

  const href = HAS_SCHEME.test(R.url) ? R.url : `http://${R.url}`;
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return {
      ok: false,
      empty: false,
      error: `That URL doesn't look right: ${R.url}`,
    };
  }
  if (!/^https?:$/.test(u.protocol)) {
    return {
      ok: false,
      empty: false,
      error: `Only http and https URLs can be converted (this one is ${u.protocol.slice(0, -1)}).`,
    };
  }
  const query: Pair[] = [];
  u.searchParams.forEach((v, k) => query.push([k, v]));
  for (const q of R.urlQuery) query.push(...splitForm(q));
  let rawQuery: string | null = R.urlQuery.length ? null : u.search.slice(1);

  const vars = shellVariables(R);
  if (vars.length) {
    info(
      `Uses shell variable${vars.length > 1 ? "s" : ""} ${vars.map((v) => `$${v}`).join(", ")}. In headers and passwords the code reads ${vars.length > 1 ? "them" : "it"} from the environment; anywhere else, put in the real value first.`,
    );
  }

  const fileRef = R.data.find((p) => p.file);
  if (fileRef)
    warn(
      `“${fileRef.v}” tells curl to read the body from a file, which the code can't do for you. Read the file in your code, or paste its contents with --data-raw.`,
    );

  let raw = R.data
    .filter((p) => !p.file)
    .map((p) => p.v)
    .join("&");
  if (R.json !== null) {
    raw = R.json;
    if (raw.startsWith("@")) {
      warn(
        `--json ${raw} reads the JSON from a file. Read the file in your code, or paste the JSON itself.`,
      );
      raw = "";
    }
    if (!headerGet(headers, "content-type"))
      headers.push(["Content-Type", "application/json"]);
    if (!headerGet(headers, "accept"))
      headers.push(["Accept", "application/json"]);
  }
  if (R.get && raw) {
    query.push(...splitForm(raw));
    rawQuery = null;
    raw = "";
  }

  if (R.form.length) {
    body = {
      kind: "multipart",
      fields: R.form.map(({ raw: f, literal }) => {
        const ix = f.indexOf("=");
        const name = ix < 0 ? f : f.slice(0, ix);
        const v = ix < 0 ? "" : f.slice(ix + 1);
        if (!literal && v.startsWith("@")) {
          const { path, type } = formFile(v.slice(1));
          return { name, value: "", file: path, ...(type ? { type } : {}) };
        }
        if (!literal && v.startsWith("<")) {
          warn(
            `-F ${name}=<${v.slice(1)} reads the field's text from a file. Paste the text instead.`,
          );
          return { name, value: "" };
        }
        return { name, value: v };
      }),
    };
    headers = headerDel(headers, "content-type");
  } else if (raw) {
    const ct = (headerGet(headers, "content-type") ?? "").toLowerCase();
    const first = raw.trimStart()[0];
    let json: JsonValue | undefined;
    if ((first === "{" || first === "[") && (!ct || ct.includes("json"))) {
      try {
        json = parseJson(raw);
      } catch (e) {
        if (ct.includes("json") && e instanceof JsonSyntaxError)
          warn(
            `The body isn't valid JSON (${e.message}). It's sent as plain text.`,
          );
      }
    }
    if (json !== undefined) {
      body = { kind: "json", raw, value: json };
      if (!ct) {
        headers.push(["Content-Type", "application/json"]);
        info(
          "The body is JSON but there was no Content-Type header. curl would send it as a form; the code sends it as JSON.",
        );
      }
    } else if (!ct || ct.includes("x-www-form-urlencoded")) {
      body = { kind: "form", fields: splitForm(raw) };
      if (!ct)
        headers.push(["Content-Type", "application/x-www-form-urlencoded"]);
    } else body = { kind: "raw", raw, type: ct };
  }

  if (R.upload) {
    warn(
      `-T ${R.upload} uploads a file as the body. Read the file in your code and send it as the body.`,
    );
  }

  const method =
    R.method ??
    defaultMethod(
      R.head,
      Boolean(R.upload),
      // A body read from a file still makes curl POST (unless -G).
      body.kind !== "none" || (!R.get && R.data.length > 0) || R.json !== null,
    );
  if ((method === "GET" || method === "HEAD") && body.kind !== "none") {
    warn(
      `A ${method} with a body: fetch and most browsers refuse to send it. Use -G to put the data in the query string.`,
    );
  }

  let auth: CurlRequest["auth"] = null;
  if (R.user !== null) {
    const ci = R.user.indexOf(":");
    auth = {
      user: ci < 0 ? R.user : R.user.slice(0, ci),
      pass: ci < 0 ? "" : R.user.slice(ci + 1),
    };
    if (ci < 0)
      info(
        "-u has no password, so curl would ask for one. The code uses an empty password.",
      );
  } else if (u.username) {
    // https://user:pass@host — curl sends these as basic auth.
    auth = { user: pctDecode(u.username), pass: pctDecode(u.password) };
  }

  for (const c of R.cookies) {
    if (c.includes("=")) {
      const existing = headerGet(headers, "cookie");
      headers = headerDel(headers, "cookie");
      headers.push(["Cookie", existing ? `${existing}; ${c}` : c]);
    } else
      warn(
        `-b ${c} reads cookies from a file, which can't be translated. Paste the cookie values instead.`,
      );
  }
  if (R.cookieJar)
    info(
      "--cookie-jar saves cookies to a file. The generated code doesn't keep cookies between requests.",
    );
  if (R.insecure)
    warn(
      "-k turns off certificate checks. The code keeps them on — only switch them off for a local test server.",
    );
  if (R.proxy)
    info(
      `Proxy ${R.proxy} isn't included. Set it in your HTTP client or with the HTTPS_PROXY variable.`,
    );
  if (R.output)
    info(
      `-o ${R.output} saves the response to a file. The code reads the response instead.`,
    );
  if (R.unknown.length)
    info(
      `Ignored: ${R.unknown.slice(0, 6).join(" ")}${R.unknown.length > 6 ? " …" : ""}`,
    );

  const url = `${u.origin}${u.pathname}`;
  return {
    ok: true,
    req: {
      method,
      url,
      origin: u.origin,
      path: u.pathname,
      query,
      rawQuery,
      headers,
      body,
      auth,
      follow: R.follow,
      insecure: R.insecure,
      compressed: R.compressed,
      silent: R.silent,
      timeout: R.timeout ?? R.connectTimeout,
      warnings,
    },
  };
}
