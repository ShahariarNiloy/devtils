"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/cn";
import { literal, JSON_STYLE } from "../curl-json.lib";
import type { CurlRequest } from "../curl-parse.lib";
import {
  BROWSER_HEADER,
  isSecretHeader,
  type Prepared,
} from "../curl-generate.lib";
import { KvTable, Section, Warnings, methodText } from "./ui";

const BODY_LABEL = {
  json: "JSON",
  form: "Form (urlencoded)",
  multipart: "Multipart form",
  raw: "Raw",
  none: "",
} as const;
/** Headers shown before "Show N more". */
const HEADER_PREVIEW = 6;

/** "Bearer sk_t••••••" — enough to recognise, not enough to leak in a screenshot. */
const mask = (v: string) =>
  v.replace(
    /^((?:Bearer|Basic|Token|Bot)\s+)?(.{0,4}).*$/i,
    (_, a: string | undefined, b: string) => `${a ?? ""}${b}••••••`,
  );

const ROW =
  "grid gap-2.5 border-b border-white/4 px-2.5 py-[7px] font-mono text-xs last:border-b-0";

/** What the command does, read back: method, URL, query, headers, auth, body. */
export const ParsedView = memo(function ParsedView({
  req,
  prepared,
  env,
  dropNoise,
}: {
  req: CurlRequest;
  prepared: Prepared | null;
  env: boolean;
  dropNoise: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = req.headers.map(([k, v]) => {
    const browser = BROWSER_HEADER.test(k);
    const secret = isSecretHeader(k) && v !== "";
    const gone = browser && dropNoise;
    const envName = prepared?.headers.find(
      (h) => h.name.toLowerCase() === k.toLowerCase(),
    )?.secret?.env;
    let tag = "";
    if (gone) tag = "dropped";
    else if (secret && env && envName) tag = `→ ${envName}`;
    else if (secret) tag = "secret";
    else if (browser) tag = "browser";
    return { k, v: secret && env ? mask(v) : v, tag, gone, secret };
  });
  // Dropped headers sink to the bottom.
  rows.sort((a, b) => Number(a.gone) - Number(b.gone));
  const shown =
    showAll || rows.length <= HEADER_PREVIEW + 1
      ? rows
      : rows.slice(0, HEADER_PREVIEW);
  const b = req.body;

  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "shrink-0 rounded-md border border-white/8 bg-white/5 px-2 py-[3px] font-mono text-xs font-bold",
            methodText(req.method),
          )}
        >
          {req.method}
        </span>
        <span
          className="min-w-0 truncate font-mono text-[13px]"
          title={req.url}
        >
          <span className="text-text-faint">{req.origin}</span>
          <span className="text-text">
            {req.url.slice(req.origin.length) || "/"}
          </span>
        </span>
      </div>

      <Warnings items={req.warnings} />

      {req.query.length > 0 && (
        <Section title={`QUERY · ${req.query.length}`}>
          <KvTable>
            {req.query.map(([k, v]) => (
              // Repeated names are allowed; the value keeps the key unique.
              <div
                key={`${k}\u0000${v}`}
                className={cn(
                  ROW,
                  "grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]",
                )}
              >
                <span className="truncate text-syntax-key">{k}</span>
                <span className="break-all text-text-key">{v}</span>
              </div>
            ))}
          </KvTable>
        </Section>
      )}

      {rows.length > 0 && (
        <Section title={`HEADERS · ${rows.length}`}>
          <KvTable>
            {shown.map((h) => (
              <div
                key={h.k}
                className={cn(
                  ROW,
                  "grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)_96px] items-center",
                  h.gone && "opacity-45",
                )}
              >
                <span
                  className={cn(
                    "truncate text-syntax-key",
                    h.gone && "line-through",
                  )}
                >
                  {h.k}
                </span>
                <span
                  className={cn(
                    "truncate text-text-key",
                    h.gone && "line-through",
                  )}
                  title={h.secret && env ? undefined : h.v}
                >
                  {h.v}
                </span>
                {h.tag ? (
                  <span
                    className={cn(
                      "max-w-[110px] justify-self-end truncate rounded-full px-[7px] py-px font-sans text-[10.5px] font-semibold whitespace-nowrap",
                      h.secret && !h.gone
                        ? "bg-[rgba(224,160,114,.12)] text-tier-pro-text"
                        : "bg-white/5 text-text-faint",
                    )}
                  >
                    {h.tag}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))}
            {shown.length < rows.length && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="min-h-8 w-full cursor-pointer border-0 bg-white/2 text-xs text-text-tertiary hover:text-text max-sm:min-h-11"
              >
                Show {rows.length - shown.length} more
              </button>
            )}
          </KvTable>
        </Section>
      )}

      {req.auth && (
        <Section title="BASIC AUTH">
          <div className="flex gap-4 rounded-[10px] border border-white/6 px-2.5 py-2 font-mono text-xs">
            <span className="text-text-key">{req.auth.user}</span>
            <span className="text-tier-pro-text">
              {req.auth.pass
                ? `••••••${env && prepared?.auth?.env ? `  → ${prepared.auth.env}` : ""}`
                : "(none)"}
            </span>
          </div>
        </Section>
      )}

      {b.kind !== "none" && (
        <Section title={`BODY · ${BODY_LABEL[b.kind]}`}>
          {b.kind === "json" || b.kind === "raw" ? (
            <pre className="m-0 max-h-[320px] overflow-auto rounded-[10px] border border-white/6 bg-[#0d0d0c] px-3 py-2.5 font-mono text-xs leading-[1.6] break-all whitespace-pre-wrap text-syntax-plain">
              {b.kind === "json" ? literal(b.value, JSON_STYLE) : b.raw}
            </pre>
          ) : (
            <KvTable>
              {(b.kind === "form"
                ? b.fields.map(([k, v]) => ({ k, v }))
                : b.fields.map((f) => ({
                    k: f.name,
                    v:
                      f.file !== undefined
                        ? `📎 ${f.file}${f.type ? ` · ${f.type}` : ""}`
                        : f.value,
                  }))
              ).map((r) => (
                <div
                  key={`${r.k}\u0000${r.v}`}
                  className={cn(
                    ROW,
                    "grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]",
                  )}
                >
                  <span className="text-syntax-key">{r.k}</span>
                  <span className="break-all text-text-key">{r.v}</span>
                </div>
              ))}
            </KvTable>
          )}
        </Section>
      )}
    </>
  );
});
