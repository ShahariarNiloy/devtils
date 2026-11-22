"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  format,
  getLanguage,
  statsFor,
  type FormatOptions,
  type FormatResult,
  type FormatStats,
  type LanguageId,
} from "./code-formatter.lib";
import { useLiveText } from "./use-live-text";

/**
 * State + debounced formatting for the code-formatter UI.
 *
 * `pending` is true while a debounce timer is queued OR a Prettier
 * `format()` is in flight. Useful for showing a subtle indicator without
 * blocking the input.
 *
 * `elapsed` is the duration of the most recent format in ms (rounded to
 * the nearest int). Pulled from `performance.now()` brackets around the
 * `format()` call, so it includes Prettier's parse + reformat but not the
 * one-shot plugin import (only fires on first format per language).
 */

const DEBOUNCE_MS = 250;
const SAMPLES: Record<LanguageId, string> = {
  javascript: `const greet = (name) => {if (!name) {return 'Hello, stranger';} const hour = new Date().getHours(); return hour < 12 ? \`Good morning, \${name}\` : \`Hello, \${name}\`;}; export default greet;`,
  typescript: `interface User{id:number;name:string;email?:string;}function getUser(id:number):User{return{id,name:"a",email:"a@b.com"};}const list:User[]=[1,2,3].map(i=>getUser(i));`,
  jsx: `function Card({title,children}){return(<div className="card"><h2>{title}</h2><div className="body">{children}</div></div>);}`,
  tsx: `function Card<T>({items,render}:{items:T[];render:(item:T)=>React.ReactNode}){return(<ul>{items.map((x,i)=>(<li key={i}>{render(x)}</li>))}</ul>);}`,
  flow: `// @flow\ntype User={id:number,name:string,email?:string};function getUser(id:number):User{return {id,name:"a",email:"a@b.com"};}const list:Array<User>=[1,2,3].map(getUser);`,
  json: `{"name":"utilyx","version":"1.0.0","dependencies":{"react":"^19.0.0","next":"^16.0.0"},"scripts":{"dev":"next dev","build":"next build"}}`,
  json5: `{name:'utilyx',version:'1.0.0',// dependencies\ndeps:{react:"^19.0.0",next:"^16.0.0",}}`,
  jsonc: `{\n// Reference: https://www.typescriptlang.org/tsconfig\n"compilerOptions":{"target":"ES2022","strict":true,/* enables every strict-mode check */"jsx":"preserve","paths":{"@/*":["./src/*"]}},"exclude":["node_modules"]}`,
  css: `.card{display:flex;gap:12px;padding:16px 20px;border-radius:12px;background:#121211}.card:hover{border-color:rgba(224,160,114,.45)}@media (max-width:600px){.card{flex-direction:column}}`,
  scss: `$brand:#cde65a;.card{padding:12px;border:1px solid #ddd;border-radius:8px;&__header{font-size:18px;color:$brand;&:hover{opacity:.8}}}`,
  less: `@brand:#cde65a;.card{padding:12px;border:1px solid #ddd;border-radius:8px;.header{font-size:18px;color:@brand;&:hover{opacity:.8}}}`,
  html: `<!doctype html><html><head><meta charset="utf-8"><title>utilyx</title></head><body><main class="hero"><h1>Every tool you need.</h1><p>Fast, private, <strong>free</strong>.</p><img src="logo.svg" alt="utilyx"></main></body></html>`,
  vue: `<template><div class="card"><h2>{{title}}</h2><slot></slot></div></template><script setup>defineProps({title:String})</script><style scoped>.card{padding:12px}</style>`,
  angular: `<div class="card" [class.active]="isActive" (click)="onClick($event)"><h2>{{title|titlecase}}</h2><ng-container *ngIf="items as list"><p *ngFor="let i of list;trackBy:trackId">{{i.name}}</p></ng-container></div>`,
  handlebars: `<div class="card">{{#if user}}<h2>Hi {{user.name}}</h2>{{else}}<h2>Welcome</h2>{{/if}}<ul>{{#each items as |item index|}}<li>{{index}}: {{item.title}}</li>{{/each}}</ul></div>`,
  markdown: `# Hello   World\n\nA  paragraph    with   excessive whitespace.\n\n*   item one\n* item two\n*    item three\n\n\`\`\`js\nconst x=1\n\`\`\``,
  mdx: `import {Foo} from './foo'\n\n# Hello   MDX\n\nA  paragraph    with a  <Foo  bar={42}  baz="hi"  /> component  inline.\n\n* one\n*  two`,
  yaml: `name:    utilyx\nversion: 1.0.0\ndeps:\n - react\n -  next\nscripts:\n  dev: next dev\n  build:   next build`,
  graphql: `query GetUser($id:ID!){user(id:$id){id name email posts(limit:10){id title body comments{id text author{name}}}}}`,
};

export interface CodeFormatterState {
  input: string;
  /** The editor's onChange. */
  setInput: (v: string) => void;
  /** Replace the whole input (paste, dropped file) after pending edits have landed. */
  replaceInput: (v: string) => void;
  output: string;
  error: string | null;
  errorLine: number | undefined;
  language: LanguageId;
  setLanguage: (id: LanguageId) => void;
  options: FormatOptions;
  setOption: <K extends keyof FormatOptions>(key: K, value: FormatOptions[K]) => void;
  pending: boolean;
  elapsed: number;
  stats: FormatStats;
  loadSample: () => void;
  clear: () => void;
}

export function useCodeFormatter(): CodeFormatterState {
  const { text: input, set: setInput, read: readInput, replace: replaceInput } = useLiveText(SAMPLES.javascript);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | undefined>(undefined);
  const [language, setLanguageRaw] = useState<LanguageId>("javascript");
  const [options, setOptions] = useState<FormatOptions>({
    tabWidth: 2,
    useTabs: false,
    printWidth: 80,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
  });
  const [pending, setPending] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic counter so a slow in-flight format doesn't overwrite a
  // newer result that finished first.
  const requestId = useRef<number>(0);

  // Debounced format. Re-runs on every input/language/option change.
  // The `setPending(true)` at the top is a legitimate effect-bridging
  // signal — it tells the UI that an async format is queued. The lint
  // rule defaults to flagging any setState-in-effect; here it's the
  // correct tool, so we disable it locally with the rationale next to
  // the call.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const id = ++requestId.current;
      const started = performance.now();
      void format(input, language, options).then((result: FormatResult) => {
        if (id !== requestId.current) return; // a newer request superseded us
        const ms = Math.round(performance.now() - started);
        setElapsed(ms);
        if (result.ok) {
          setOutput(result.output);
          setError(null);
          setErrorLine(undefined);
        } else {
          // Honest empty state: keep the previous output visible so the
          // user can compare, but surface the error prominently.
          setError(result.error);
          setErrorLine(result.line);
        }
        setPending(false);
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [input, language, options]);

  const setOption = useCallback(
    <K extends keyof FormatOptions>(key: K, value: FormatOptions[K]) => {
      setOptions((o) => ({ ...o, [key]: value }));
    },
    [],
  );

  // Switching language swaps in that language's sample — but only while the
  // editor still holds an untouched sample (or nothing); real input stays.
  const setLanguage = useCallback(
    (id: LanguageId) => {
      setLanguageRaw(id);
      const cur = readInput();
      if (!cur.trim() || cur === SAMPLES[language]) setInput(SAMPLES[id]);
    },
    [language, readInput, setInput],
  );

  const loadSample = useCallback(() => {
    replaceInput(SAMPLES[language] ?? "");
  }, [language, replaceInput]);

  const clear = useCallback(() => {
    replaceInput("");
  }, [replaceInput]);

  const stats = statsFor(input, output);
  // Surface which option groups this language honours so the UI can hide
  // chips that don't apply (e.g. `semi` on JSON).
  void getLanguage(language);

  return {
    input,
    setInput,
    replaceInput,
    output,
    error,
    errorLine,
    language,
    setLanguage,
    options,
    setOption,
    pending,
    elapsed,
    stats,
    loadSample,
    clear,
  };
}
