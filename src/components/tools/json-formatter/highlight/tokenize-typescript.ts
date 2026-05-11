import type { Token } from "./types";
import { tokenizeCLike } from "./tokenize-c-like";

const KW = new Set([
  "abstract","any","as","async","await","break","case","catch","class",
  "const","continue","debugger","declare","default","delete","do","else",
  "enum","export","extends","finally","for","from","function","get","if",
  "implements","import","in","infer","instanceof","interface","is","keyof",
  "let","namespace","new","of","package","private","protected","public",
  "readonly","return","satisfies","set","static","super","switch","this",
  "throw","try","type","typeof","var","void","while","with","yield",
]);

const TYPES = new Set([
  "string","number","boolean","bigint","symbol","object","unknown","never",
  "any","void","Array","Record","Map","Set","Promise","Date","RegExp",
  "Partial","Required","Readonly","Pick","Omit","Exclude","Extract",
  "NonNullable","Parameters","ReturnType","Awaited","ReadonlyArray",
]);

export function tokenizeTypeScript(source: string): Token[] {
  return tokenizeCLike(source, {
    keywords: KW,
    types: TYPES,
    singleQuoteStrings: true,
    backtickStrings: true,
  });
}
