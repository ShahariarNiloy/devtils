/**
 * The cURL generator's form ⇄ the request model. Pure.
 */

import {
  JsonSyntaxError,
  literal,
  JSON_STYLE,
  parseJson,
} from "./curl-json.lib";
import {
  headerGet,
  type CurlRequest,
  type MultipartField,
  type Pair,
  type Warning,
} from "./curl-parse.lib";

export type AuthKind = "none" | "bearer" | "basic";
export type FormBodyKind = "none" | "json" | "form" | "multipart" | "raw";
export type Row = readonly [string, string];

export interface FormPart {
  name: string;
  value: string;
  file: boolean;
}

export interface BuildForm {
  method: string;
  url: string;
  query: Row[];
  headers: Row[];
  authKind: AuthKind;
  token: string;
  user: string;
  pass: string;
  bodyKind: FormBodyKind;
  json: string;
  form: Row[];
  multipart: FormPart[];
  raw: string;
  follow: boolean;
  compressed: boolean;
  insecure: boolean;
  silent: boolean;
  /** Seconds, as typed. */
  timeout: string;
}

export const METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export const DEFAULT_FORM: BuildForm = {
  method: "POST",
  url: "https://api.example.com/v1/customers",
  query: [],
  headers: [["Accept", "application/json"]],
  authKind: "bearer",
  token: "sk_test_51Hx9cAbCdEf",
  user: "",
  pass: "",
  bodyKind: "json",
  json: '{\n  "email": "ada@example.com",\n  "name": "Ada Lovelace",\n  "metadata": { "plan": "pro" }\n}',
  form: [["", ""]],
  multipart: [{ name: "file", value: "./avatar.png", file: true }],
  raw: "",
  follow: true,
  compressed: false,
  insecure: false,
  silent: false,
  timeout: "30",
};

export type FormResult =
  | { ok: true; req: CurlRequest }
  | { ok: false; error: string };

export function requestFromForm(F: BuildForm): FormResult {
  const warnings: Warning[] = [];
  let url = F.url.trim();
  if (!url) return { ok: false, error: "Add a URL to start." };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, error: "That URL doesn't look right." };
  }
  const query: Pair[] = [];
  u.searchParams.forEach((v, k) => query.push([k, v]));
  for (const [k, v] of F.query) if (k) query.push([k, v]);
  let headers: Pair[] = F.headers
    .filter(([k]) => k.trim())
    .map(([k, v]) => [k.trim(), v]);
  const has = (n: string) => headerGet(headers, n) !== null;

  let auth: CurlRequest["auth"] = null;
  if (F.authKind === "bearer" && F.token) {
    headers = [
      ["Authorization", `Bearer ${F.token}`],
      ...headers.filter(([k]) => k.toLowerCase() !== "authorization"),
    ];
  }
  if (F.authKind === "basic" && F.user) auth = { user: F.user, pass: F.pass };

  let body: CurlRequest["body"] = { kind: "none" };
  if (F.bodyKind === "json" && F.json.trim()) {
    try {
      body = { kind: "json", raw: F.json, value: parseJson(F.json) };
    } catch (e) {
      return {
        ok: false,
        error: `The JSON body isn't valid: ${e instanceof JsonSyntaxError ? e.message : "check the syntax"}.`,
      };
    }
    if (!has("content-type"))
      headers.push(["Content-Type", "application/json"]);
  } else if (F.bodyKind === "form") {
    const fields = F.form.filter(([k]) => k);
    if (fields.length) {
      body = { kind: "form", fields };
      if (!has("content-type"))
        headers.push(["Content-Type", "application/x-www-form-urlencoded"]);
    }
  } else if (F.bodyKind === "multipart") {
    const fields: MultipartField[] = F.multipart
      .filter((f) => f.name)
      .map((f) =>
        f.file
          ? { name: f.name, value: "", file: f.value || "file.bin" }
          : { name: f.name, value: f.value },
      );
    if (fields.length) body = { kind: "multipart", fields };
  } else if (F.bodyKind === "raw" && F.raw) {
    body = {
      kind: "raw",
      raw: F.raw,
      type: headerGet(headers, "content-type") ?? "",
    };
  }

  const method = F.method || "GET";
  if ((method === "GET" || method === "HEAD") && body.kind !== "none") {
    warnings.push({
      level: "warn",
      text: `${method} requests normally have no body. Most servers and all browsers will ignore or reject it.`,
    });
  }
  if (F.insecure)
    warnings.push({
      level: "warn",
      text: "-k turns off certificate checks. Fine for a local test server, never for production.",
    });

  const timeout = Number.parseFloat(F.timeout);
  return {
    ok: true,
    req: {
      method,
      url: `${u.origin}${u.pathname}`,
      origin: u.origin,
      path: u.pathname,
      query,
      rawQuery: null,
      headers,
      body,
      auth,
      follow: F.follow,
      insecure: F.insecure,
      compressed: F.compressed,
      silent: F.silent,
      timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : null,
      warnings,
    },
  };
}

/** Fill the form from a parsed command ("Import a cURL command", "Edit as a form"). */
export function formFromRequest(req: CurlRequest): BuildForm {
  const F: BuildForm = {
    ...DEFAULT_FORM,
    method: req.method,
    url: req.url,
    query: req.query.map(([k, v]) => [k, v]),
    headers: [],
    authKind: "none",
    token: "",
    user: "",
    pass: "",
    bodyKind: req.body.kind,
    json: "",
    form: [["", ""]],
    multipart: [{ name: "", value: "", file: false }],
    raw: "",
    follow: req.follow,
    compressed: req.compressed,
    insecure: req.insecure,
    silent: req.silent,
    timeout: req.timeout ? String(req.timeout) : "",
  };
  const b = req.body;
  for (const [k, v] of req.headers) {
    const bearer = /^authorization$/i.test(k)
      ? /^Bearer\s+(.+)$/i.exec(v)
      : null;
    if (bearer && F.authKind === "none") {
      F.authKind = "bearer";
      F.token = bearer[1];
      continue;
    }
    // The form adds these itself for JSON and form bodies.
    if (
      /^content-type$/i.test(k) &&
      ((b.kind === "json" && /json/i.test(v)) ||
        (b.kind === "form" && /urlencoded/i.test(v)))
    )
      continue;
    F.headers.push([k, v]);
  }
  if (req.auth) {
    F.authKind = "basic";
    F.user = req.auth.user;
    F.pass = req.auth.pass;
  }
  if (b.kind === "json") F.json = literal(b.value, JSON_STYLE);
  if (b.kind === "form") F.form = b.fields.map(([k, v]) => [k, v]);
  if (b.kind === "multipart")
    F.multipart = b.fields.map((f) =>
      f.file !== undefined
        ? { name: f.name, value: f.file, file: true }
        : { name: f.name, value: f.value, file: false },
    );
  if (b.kind === "raw") F.raw = b.raw;
  return F;
}

/** "Valid JSON" / "Invalid JSON …" under the JSON body editor. */
export function jsonState(text: string): { ok: boolean; label: string } | null {
  if (!text.trim()) return null;
  try {
    parseJson(text);
    return { ok: true, label: "Valid JSON" };
  } catch (e) {
    return {
      ok: false,
      label: e instanceof JsonSyntaxError ? e.message : "Invalid JSON",
    };
  }
}

/** Pretty-print the JSON body, numbers exactly as typed. */
export function formatJsonBody(text: string): string | null {
  try {
    return literal(parseJson(text), JSON_STYLE);
  } catch {
    return null;
  }
}
