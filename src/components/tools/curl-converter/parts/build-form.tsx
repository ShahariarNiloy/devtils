"use client";
/* eslint-disable react/no-array-index-key -- form rows have no identity but their position while typed into. */

import { memo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  formatJsonBody,
  jsonState,
  METHODS,
  type AuthKind,
  type BuildForm,
  type FormBodyKind,
  type Row,
} from "../curl-form.lib";
import type { Warning } from "../curl-parse.lib";
import { DASHED, FIELD, Section, Segmented, Warnings, methodText } from "./ui";
import { Dropdown } from "@/components/primitives/select";

type Patch = (p: Partial<BuildForm>) => void;
type RowKey = "query" | "headers" | "form";

const QUICK_HEADERS: readonly Row[] = [
  ["Accept", "application/json"],
  ["Content-Type", "application/json"],
  ["User-Agent", "my-app/1.0"],
  ["Idempotency-Key", "a1b2c3d4"],
];

const AUTH: readonly (readonly [AuthKind, string])[] = [
  ["none", "None"],
  ["bearer", "Bearer token"],
  ["basic", "Basic"],
];
const BODY: readonly (readonly [FormBodyKind, string])[] = [
  ["none", "None"],
  ["json", "JSON"],
  ["form", "Form"],
  ["multipart", "Multipart"],
  ["raw", "Raw"],
];
const OPTIONS: readonly (readonly [
  "follow" | "compressed" | "silent" | "insecure",
  string,
  string,
])[] = [
  ["follow", "Follow redirects", "-L"],
  ["compressed", "Compressed", "--compressed"],
  ["silent", "Silent", "-s"],
  ["insecure", "Skip TLS checks", "-k"],
];

const METHOD_OPTIONS = METHODS.map((m) => ({ value: m, label: m }));

const REMOVE =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[7px] border-0 bg-transparent text-[15px] text-text-faint hover:bg-white/5 hover:text-text max-sm:size-11";

function Rows({
  F,
  set,
  k,
  ph,
}: {
  F: BuildForm;
  set: Patch;
  k: RowKey;
  ph: readonly [string, string];
}) {
  const rows = F[k];
  const update = (i: number, j: 0 | 1, v: string) =>
    set({
      [k]: rows.map((r, x): Row => {
        if (x !== i) return r;
        return j === 0 ? [v, r[1]] : [r[0], v];
      }),
    });
  return rows.map((r, i) => (
    <div
      key={i}
      className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)_28px] items-center gap-1.5 max-sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)_44px]"
    >
      <input
        value={r[0]}
        onChange={(e) => update(i, 0, e.target.value)}
        placeholder={ph[0]}
        aria-label={`${ph[0]} ${i + 1}`}
        spellCheck={false}
        className={cn(FIELD, "text-[#8fd0d8]")}
      />
      <input
        value={r[1]}
        onChange={(e) => update(i, 1, e.target.value)}
        placeholder={ph[1]}
        aria-label={`${ph[1]} ${i + 1}`}
        spellCheck={false}
        className={FIELD}
      />
      <button
        type="button"
        aria-label={`Remove ${r[0] || ph[0]}`}
        onClick={() => set({ [k]: rows.filter((_, x) => x !== i) })}
        className={REMOVE}
      >
        ×
      </button>
    </div>
  ));
}

export const BuildFormView = memo(function BuildFormView({
  F,
  set,
  error,
  warnings,
  onImport,
}: {
  F: BuildForm;
  set: Patch;
  error: string;
  warnings: readonly Warning[];
  /** Parse a pasted command into the form; returns an error message or "". */
  onImport: (src: string) => string;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErr, setImportErr] = useState("");
  const js = F.bodyKind === "json" ? jsonState(F.json) : null;
  const quick = QUICK_HEADERS.filter(
    ([n]) => !F.headers.some(([h]) => h.toLowerCase() === n.toLowerCase()),
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={importOpen}
          onClick={() => {
            setImportOpen((o) => !o);
            setImportErr("");
          }}
          className="min-h-[30px] cursor-pointer self-start rounded-lg border border-white/12 bg-white/3 px-3 text-[12.5px] font-semibold text-text-key hover:border-border-strong max-sm:min-h-11"
        >
          ⇣ Import a cURL command
        </button>
        {importOpen && (
          <div className="flex flex-col gap-2 rounded-[10px] border border-white/8 bg-[#0d0d0c] p-2.5">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              placeholder="curl https://… -H '…'"
              aria-label="cURL command to import"
              className="h-[90px] resize-y rounded-lg border border-white/8 bg-bg px-2.5 py-2 font-mono text-xs text-text-key outline-none focus-visible:border-border-strong"
            />
            {importErr && (
              <span role="alert" className="text-xs text-[#f0a892]">
                {importErr}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                const err = onImport(importText);
                setImportErr(err);
                if (!err) {
                  setImportOpen(false);
                  setImportText("");
                }
              }}
              className="btn-action min-h-[30px] cursor-pointer self-start rounded-lg px-3 text-[12.5px] font-bold max-sm:min-h-11"
            >
              Fill the form
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[9px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3 py-[9px] text-[13px] text-[#f0a892]"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-1.5">
        <Dropdown
          aria-label="Method"
          value={F.method}
          onChange={(method) => set({ method })}
          options={METHOD_OPTIONS}
          className={cn(FIELD, "h-auto font-bold", methodText(F.method))}
        />
        <input
          value={F.url}
          onChange={(e) => set({ url: e.target.value })}
          placeholder="https://api.example.com/users"
          aria-label="URL"
          spellCheck={false}
          className={FIELD}
        />
      </div>

      <Section title="QUERY">
        <Rows F={F} set={set} k="query" ph={["name", "value"]} />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => set({ query: [...F.query, ["", ""]] })}
            className={DASHED}
          >
            + Add parameter
          </button>
        </div>
      </Section>

      <Section title="HEADERS">
        <Rows F={F} set={set} k="headers" ph={["Header", "value"]} />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => set({ headers: [...F.headers, ["", ""]] })}
            className={DASHED}
          >
            + Add header
          </button>
          {quick.map((h) => (
            <button
              key={h[0]}
              type="button"
              onClick={() => set({ headers: [...F.headers, h] })}
              className="min-h-7 cursor-pointer rounded-[7px] border-0 bg-white/4 px-[9px] font-mono text-[11px] text-text-faint hover:text-text max-sm:min-h-11"
            >
              + {h[0]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="AUTH" gap="gap-2">
        <Segmented
          label="Auth"
          value={F.authKind}
          options={AUTH}
          onChange={(authKind) => set({ authKind })}
        />
        {F.authKind === "bearer" && (
          <input
            value={F.token}
            onChange={(e) => set({ token: e.target.value })}
            placeholder="token"
            aria-label="Bearer token"
            spellCheck={false}
            autoComplete="off"
            className={FIELD}
          />
        )}
        {F.authKind === "basic" && (
          <div className="grid grid-cols-2 gap-1.5">
            <input
              value={F.user}
              onChange={(e) => set({ user: e.target.value })}
              placeholder="username"
              aria-label="Username"
              autoComplete="off"
              className={FIELD}
            />
            <input
              value={F.pass}
              onChange={(e) => set({ pass: e.target.value })}
              placeholder="password"
              aria-label="Password"
              type="password"
              autoComplete="off"
              className={FIELD}
            />
          </div>
        )}
      </Section>

      <Section title="BODY" gap="gap-2">
        <Segmented
          label="Body type"
          value={F.bodyKind}
          options={BODY}
          onChange={(bodyKind) => set({ bodyKind })}
        />
        {F.bodyKind === "json" && (
          <div className="flex flex-col gap-1.5">
            <textarea
              value={F.json}
              onChange={(e) => set({ json: e.target.value })}
              spellCheck={false}
              aria-label="JSON body"
              className="h-[150px] resize-y rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 py-2 font-mono text-xs leading-[1.6] text-syntax-plain outline-none focus-visible:border-border-strong"
            />
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "min-w-0 truncate text-xs",
                  js?.ok === false ? "text-[#f0a892]" : "text-success-text",
                )}
              >
                {js?.label}
              </span>
              <span className="grow" />
              <button
                type="button"
                disabled={!js?.ok}
                onClick={() => {
                  const pretty = formatJsonBody(F.json);
                  if (pretty !== null) set({ json: pretty });
                }}
                className="min-h-7 cursor-pointer rounded-[7px] border border-white/16 bg-transparent px-2.5 text-xs text-text-tertiary hover:text-text disabled:cursor-default disabled:opacity-40 max-sm:min-h-11"
              >
                Format
              </button>
            </div>
          </div>
        )}
        {F.bodyKind === "form" && (
          <div className="flex flex-col gap-1.5">
            <Rows F={F} set={set} k="form" ph={["field", "value"]} />
            <button
              type="button"
              onClick={() => set({ form: [...F.form, ["", ""]] })}
              className={cn(DASHED, "self-start")}
            >
              + Add field
            </button>
          </div>
        )}
        {F.bodyKind === "multipart" && (
          <div className="flex flex-col gap-1.5">
            {F.multipart.map((r, i) => {
              const upd = (p: Partial<typeof r>) =>
                set({
                  multipart: F.multipart.map((x, j) =>
                    j === i ? { ...x, ...p } : x,
                  ),
                });
              return (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,.7fr)_52px_minmax(0,1.2fr)_28px] items-center gap-1.5 max-sm:grid-cols-[minmax(0,.7fr)_52px_minmax(0,1.2fr)_44px]"
                >
                  <input
                    value={r.name}
                    onChange={(e) => upd({ name: e.target.value })}
                    placeholder="field"
                    aria-label={`Field name ${i + 1}`}
                    spellCheck={false}
                    className={cn(FIELD, "text-[#8fd0d8]")}
                  />
                  <button
                    type="button"
                    aria-pressed={r.file}
                    onClick={() => upd({ file: !r.file })}
                    className={cn(
                      "min-h-[34px] cursor-pointer rounded-lg border border-white/10 text-[11.5px] font-semibold max-sm:min-h-11",
                      r.file
                        ? "bg-[rgba(224,160,114,.12)] text-tier-pro-text"
                        : "bg-transparent text-text-faint",
                    )}
                  >
                    File
                  </button>
                  <input
                    value={r.value}
                    onChange={(e) => upd({ value: e.target.value })}
                    placeholder={r.file ? "./path/to/file" : "value"}
                    aria-label={`Value ${i + 1}`}
                    spellCheck={false}
                    className={FIELD}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${r.name || "field"}`}
                    onClick={() =>
                      set({ multipart: F.multipart.filter((_, j) => j !== i) })
                    }
                    className={REMOVE}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() =>
                set({
                  multipart: [
                    ...F.multipart,
                    { name: "", value: "", file: false },
                  ],
                })
              }
              className={cn(DASHED, "self-start")}
            >
              + Add field
            </button>
          </div>
        )}
        {F.bodyKind === "raw" && (
          <textarea
            value={F.raw}
            onChange={(e) => set({ raw: e.target.value })}
            spellCheck={false}
            aria-label="Raw body"
            className="h-[110px] resize-y rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 py-2 font-mono text-xs text-syntax-plain outline-none focus-visible:border-border-strong"
          />
        )}
      </Section>

      <Section title="OPTIONS" gap="gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {OPTIONS.map(([key, label, flag]) => (
            <button
              key={key}
              type="button"
              aria-pressed={F[key]}
              onClick={() => set({ [key]: !F[key] })}
              className={cn(
                "inline-flex min-h-[30px] cursor-pointer items-center gap-[7px] rounded-full border px-2.5 text-xs transition-colors max-sm:min-h-11",
                F[key]
                  ? "border-[rgba(224,160,114,.6)] bg-[rgba(224,160,114,.1)] text-tier-pro-text"
                  : "border-white/10 bg-transparent text-text-tertiary hover:text-text",
              )}
            >
              {label}{" "}
              <span className="font-mono text-[10.5px] opacity-70">{flag}</span>
            </button>
          ))}
          <label className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
            Timeout
            <input
              value={F.timeout}
              onChange={(e) =>
                set({ timeout: e.target.value.replace(/[^\d.]/g, "") })
              }
              inputMode="decimal"
              aria-label="Timeout in seconds"
              className={cn(FIELD, "min-h-[30px] w-14")}
            />
            s
          </label>
        </div>
      </Section>

      <Warnings items={warnings} />
    </>
  );
});
