"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { cn } from "@/lib/cn";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools/types";
import { CURL_SEO } from "./content";
import {
  DEFAULT_FORM,
  formFromRequest,
  requestFromForm,
  type BuildForm,
} from "./curl-form.lib";
import {
  BROWSER_HEADER,
  generate,
  isSecretHeader,
  type Lang,
  type Shell,
} from "./curl-generate.lib";
import { parseCurl } from "./curl-parse.lib";
import { SAMPLES, type SampleKey } from "./curl-samples";
import { BuildFormView } from "./parts/build-form";
import { CodeView } from "./parts/code-panel";
import { ParsedView } from "./parts/parsed-view";
import { Segmented, Switch } from "./parts/ui";

type Page = "convert" | "build" | Exclude<Lang, "curl">;
type Mode = "convert" | "build";

const PAGE_OF: Record<string, Page> = {
  "curl-to-code": "convert",
  "curl-generator": "build",
  "curl-to-fetch": "fetch",
  "curl-to-axios": "axios",
  "curl-to-python": "python",
  "curl-to-go": "go",
  "curl-to-php": "php",
};

/** "Convert cURL to" links. */
const NAV: readonly (readonly [string, string])[] = [
  ["curl-to-code", "Any language"],
  ["curl-to-fetch", "fetch"],
  ["curl-to-axios", "axios"],
  ["curl-to-python", "Python"],
  ["curl-to-go", "Go"],
  ["curl-to-php", "PHP"],
];

const LANGS: readonly (readonly [Exclude<Lang, "curl">, string, string])[] = [
  ["fetch", "fetch", "Browsers and Node 18+"],
  ["axios", "axios", "Node and browsers"],
  ["python", "Python", "requests"],
  ["go", "Go", "net/http"],
  ["php", "PHP", "Guzzle"],
];
const SHELLS: readonly (readonly [Shell, string])[] = [
  ["bash", "bash"],
  ["cmd", "cmd"],
  ["ps", "PowerShell"],
];
const SHELL_NOTE: Record<Shell, string> = {
  bash: "bash · zsh · macOS · Linux",
  cmd: "Windows cmd",
  ps: "PowerShell",
};
const ENV_LINE: Record<Lang, string> = {
  fetch: "Reads secrets from process.env",
  axios: "Reads secrets from process.env",
  python: "Reads secrets with os.environ",
  go: "Reads secrets with os.Getenv",
  php: "Reads secrets with getenv()",
  curl: "",
};
const ENV_SET: Record<Shell, string> = {
  bash: "Set them first: export API_TOKEN=…",
  cmd: "Set them first: set API_TOKEN=…",
  ps: "Set them first: $env:API_TOKEN = '…'",
};
const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function CurlConverter({ tool }: { tool: Tool }) {
  const page = PAGE_OF[tool.slug] ?? "convert";
  const single = page !== "convert" && page !== "build";
  const seo = CURL_SEO[tool.slug] ?? CURL_SEO["curl-to-code"];

  const [mode, setMode] = useState<Mode>(
    page === "build" ? "build" : "convert",
  );
  const [src, setSrc] = useState(SAMPLES.json.src);
  const [sample, setSample] = useState<SampleKey | null>("json");
  const [F, setF] = useState<BuildForm>(DEFAULT_FORM);
  /** The page's own language (fetch, Python…), or null on the any-language pages. */
  const pageLang: Lang | null = single ? page : null;
  const [lang, setLang] = useState<Lang>(
    page === "build" ? "curl" : (pageLang ?? "fetch"),
  );
  const [shell, setShell] = useState<Shell>("bash");
  const [multi, setMulti] = useState(true);
  const [long, setLong] = useState(false);
  const [env, setEnv] = useState(true);
  const [noise, setNoise] = useState(true);
  const build = mode === "build";

  // Typing stays instant: parse + generate trail the input by a frame.
  const dSrc = useDeferredValue(src);
  const dF = useDeferredValue(F);
  const parsed = useMemo(() => (build ? null : parseCurl(dSrc)), [build, dSrc]);
  const formed = useMemo(
    () => (build ? requestFromForm(dF) : null),
    [build, dF],
  );
  let req = null;
  if (build) req = formed?.ok ? formed.req : null;
  else if (parsed?.ok) req = parsed.req;

  const langs = useMemo(() => {
    const base = single ? LANGS.filter(([id]) => id === page) : LANGS;
    const list: (readonly [Lang, string, string])[] = [...base];
    if (build) list.unshift(["curl", "cURL", SHELL_NOTE[shell]]);
    return list;
  }, [single, page, build, shell]);
  const cur = langs.find(([id]) => id === lang) ?? langs[0];
  const curLang = cur[0];

  const out = useMemo(
    () =>
      req
        ? generate(curLang, req, {
            env,
            dropNoise: noise && !build,
            curl: { shell, multi, long },
          })
        : null,
    [req, curLang, env, noise, build, shell, multi, long],
  );
  const code = out?.code ?? "";
  const lineCount = code ? code.split("\n").length : 0;

  const noiseCount = req
    ? req.headers.filter(([k]) => BROWSER_HEADER.test(k)).length
    : 0;
  const secretCount = req
    ? req.headers.filter(([k, v]) => v && isSecretHeader(k)).length +
      (req.auth?.pass ? 1 : 0)
    : 0;

  /* -------------------------------------------------------------- copy */
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy — select the code and copy it instead.");
    }
  }, [code]);
  useShortcut({ key: "c", meta: true, shift: true }, () => void copy());

  /* ---------------------------------------------------- mode switching */
  const patchF = useCallback(
    (p: Partial<BuildForm>) => setF((f) => ({ ...f, ...p })),
    [],
  );
  const importInto = useCallback((text: string) => {
    const r = parseCurl(text);
    if (!r.ok) return r.empty ? "Paste a cURL command first." : r.error;
    setF(formFromRequest(r.req));
    return "";
  }, []);
  const toForm = () => {
    const r = parseCurl(src);
    if (r.ok) setF(formFromRequest(r.req));
    setMode("build");
  };
  const toConvert = () => {
    const r = requestFromForm(F);
    if (r.ok) {
      setSrc(
        generate("curl", r.req, {
          env: false,
          dropNoise: false,
          curl: { shell: "bash", multi: true, long: false },
        }).code,
      );
      setSample(null);
    }
    if (lang === "curl") setLang(pageLang ?? "fetch");
    setMode("convert");
  };

  const buildError = build && formed && !formed.ok ? formed.error : "";

  return (
    <ToolShell tool={tool} titleStyle="inline" relatedSlugs={seo.relatedSlugs}>
      <nav
        aria-label="cURL tools"
        className="mb-3.5 flex flex-wrap items-center gap-1.5"
      >
        <span className="mr-1 text-[12.5px] text-text-faint">
          Convert cURL to
        </span>
        {NAV.map(([slug, label]) => {
          const on = slug === tool.slug;
          return (
            <Link
              key={slug}
              href={`/tools/${slug}`}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex min-h-[30px] items-center rounded-lg border px-[11px] text-[12.5px] font-semibold transition-colors max-sm:min-h-11",
                on
                  ? "border-[rgba(224,160,114,.55)] bg-[rgba(224,160,114,.1)] text-tier-pro-text"
                  : "border-white/8 bg-white/2 text-text-strong hover:border-white/20",
              )}
            >
              {label}
            </Link>
          );
        })}
        <span aria-hidden="true" className="mx-1.5 h-[18px] w-px bg-white/10" />
        <Link
          href="/tools/curl-generator"
          aria-current={page === "build" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border px-[11px] text-[12.5px] font-semibold text-tier-pro-text max-sm:min-h-11",
            page === "build"
              ? "border-[rgba(224,160,114,.55)] bg-[rgba(224,160,114,.1)]"
              : "border-white/8 hover:border-white/20",
          )}
        >
          Build a cURL command →
        </Link>
      </nav>

      <div
        id="tool"
        className="overflow-hidden rounded-[18px] bg-[#101010] shadow-window-tool"
      >
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle bg-toolbar px-3.5 py-3">
          {build ? (
            <>
              <span className="text-[13px] font-semibold text-text-key">
                Build a request
              </span>
              <span className="text-xs text-text-faint">
                — the command updates as you type
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-text-faint">Try</span>
              {SAMPLE_KEYS.map((k) => {
                const on = sample === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSrc(SAMPLES[k].src);
                      setSample(k);
                    }}
                    className={cn(
                      "min-h-[30px] cursor-pointer rounded-full border px-[11px] text-[12.5px] transition-colors max-sm:min-h-11",
                      on
                        ? "border-[rgba(224,160,114,.6)] bg-[rgba(224,160,114,.1)] text-tier-pro-text"
                        : "border-white/10 bg-transparent text-text-tertiary hover:text-text",
                    )}
                  >
                    {SAMPLES[k].label}
                  </button>
                );
              })}
            </>
          )}
          <span className="grow" />
          {build ? (
            <button
              type="button"
              onClick={toConvert}
              className="min-h-[30px] cursor-pointer rounded-lg border border-white/12 bg-transparent px-[11px] text-xs text-text-tertiary hover:text-text max-sm:min-h-11"
            >
              Paste a command instead
            </button>
          ) : (
            <span className="hidden text-xs text-text-faint lg:inline">
              In DevTools: Network → right-click a request → Copy as cURL
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          {/* left: input + what it does, or the form */}
          <div className="flex min-w-0 flex-col border-border-subtle lg:border-r">
            {build ? (
              <div className="flex flex-col gap-4 p-3.5 lg:h-[690px] lg:overflow-auto">
                <BuildFormView
                  F={F}
                  set={patchF}
                  error={buildError}
                  warnings={req?.warnings ?? []}
                  onImport={importInto}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col border-b border-border-subtle">
                  <div className="flex items-center gap-2 px-3.5 pt-2.5">
                    <label
                      htmlFor="curl-in"
                      className="text-xs font-bold tracking-[.04em] text-text-tertiary"
                    >
                      CURL
                    </label>
                    <span className="grow" />
                    <button
                      type="button"
                      onClick={toForm}
                      className="min-h-[26px] cursor-pointer rounded-md border border-white/12 bg-transparent px-[9px] text-xs font-semibold text-text-key hover:border-border-strong max-sm:min-h-11"
                    >
                      Edit as a form
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSrc("");
                        setSample(null);
                      }}
                      className="min-h-[26px] cursor-pointer rounded-md border-0 bg-transparent px-2 text-xs text-text-faint hover:text-text max-sm:min-h-11"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    id="curl-in"
                    value={src}
                    onChange={(e) => {
                      setSrc(e.target.value);
                      setSample(null);
                    }}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    placeholder="curl https://api.example.com/users -H 'Authorization: Bearer …'"
                    className="block h-[170px] w-full resize-none border-0 bg-transparent px-3.5 pt-2 pb-3.5 font-mono text-[12.5px] leading-[1.65] break-all whitespace-pre-wrap text-[#f0ece2] outline-none placeholder:text-placeholder sm:h-[196px]"
                  />
                </div>
                <div
                  className="flex flex-col gap-3.5 p-3.5 lg:h-[452px] lg:overflow-auto"
                  aria-live="polite"
                >
                  {parsed && !parsed.ok && !parsed.empty && (
                    <div
                      role="alert"
                      className="rounded-[10px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3.5 py-3 text-[13.5px] leading-normal text-[#f0a892]"
                    >
                      {parsed.error}
                    </div>
                  )}
                  {parsed && !parsed.ok && parsed.empty && (
                    <div className="px-1.5 py-6 text-center text-sm text-text-faint">
                      Paste a cURL command above, or pick an example.
                    </div>
                  )}
                  {parsed?.ok && (
                    <ParsedView
                      req={parsed.req}
                      prepared={out?.prepared ?? null}
                      env={env}
                      dropNoise={noise}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* right: code */}
          <div className="flex min-w-0 flex-col border-t border-border-subtle lg:border-t-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border-subtle bg-[#121211] px-3 py-2.5">
              {single && !build ? (
                <span className="inline-flex min-h-9 items-center px-1 text-sm font-bold text-text">
                  {cur[1]}
                </span>
              ) : (
                <Segmented
                  label="Language"
                  tabs
                  size="md"
                  value={curLang}
                  options={langs.map(([id, label]) => [id, label] as const)}
                  onChange={setLang}
                />
              )}
              <span className="text-xs text-text-faint">{cur[2]}</span>
              <span className="grow" />
              <button
                type="button"
                onClick={() => void copy()}
                disabled={!code}
                className="btn-action inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-[13px] text-[12.5px] font-bold disabled:cursor-default disabled:opacity-50 max-sm:min-h-11"
              >
                {copied ? "Copied" : "Copy"}
                <span className="hidden font-mono text-[10.5px] opacity-55 sm:inline">
                  ⌘⇧C
                </span>
              </button>
              <span className="sr-only" aria-live="polite">
                {copied ? "Copied the code" : ""}
              </span>
            </div>

            {curLang === "curl" && (
              <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 border-b border-border-subtle px-3.5 py-2.5">
                <Segmented
                  label="Shell"
                  value={shell}
                  options={SHELLS}
                  onChange={setShell}
                />
                <Switch
                  small
                  checked={multi}
                  onChange={setMulti}
                  label="One flag per line"
                />
                <Switch
                  small
                  checked={long}
                  onChange={setLong}
                  label="Long flags (--header)"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-x-[22px] gap-y-2 border-b border-border-subtle px-3.5 py-2.5">
              <Switch
                checked={env}
                onChange={setEnv}
                label="Secrets as env variables"
                note={
                  secretCount
                    ? `${plural(secretCount, "secret")} found`
                    : "No secrets found"
                }
              />
              {!build && (
                <Switch
                  checked={noise}
                  onChange={setNoise}
                  label="Drop browser headers"
                  note={
                    noiseCount
                      ? plural(noiseCount, "browser header")
                      : "None in this request"
                  }
                />
              )}
            </div>

            {code ? (
              <CodeView
                code={code}
                lang={curLang}
                className="h-[440px] grow lg:h-[560px]"
              />
            ) : (
              <div className="flex h-[440px] grow items-center justify-center bg-[#0d0d0c] px-6 text-center text-sm text-text-faint lg:h-[560px]">
                {build
                  ? "Fix the form to see the command."
                  : "The code appears here."}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-border-subtle px-3.5 py-[9px] text-xs text-text-faint">
              <span className="font-mono">{plural(lineCount, "line")}</span>
              {env && secretCount > 0 && (
                <span className="text-tier-pro-text">
                  {curLang === "curl" ? ENV_SET[shell] : ENV_LINE[curLang]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Parsed in this tab</span>
          <span className="max-sm:hidden">
            -X -H -d --json -F -u -b -G -L -k -m and more
          </span>
          <span className="grow" />
          <span>Tokens and keys are never sent</span>
        </div>
      </div>

      <ToolContent {...seo} />
    </ToolShell>
  );
}
