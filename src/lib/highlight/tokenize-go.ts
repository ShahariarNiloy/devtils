import type { Token } from "./types";
import { tokenizeCLike } from "./tokenize-c-like";

const KW = new Set([
  "break","case","chan","const","continue","default","defer","else",
  "fallthrough","for","func","go","goto","if","import","interface","map",
  "package","range","return","select","struct","switch","type","var",
]);

const TYPES = new Set([
  "bool","byte","complex64","complex128","error","float32","float64",
  "int","int8","int16","int32","int64","rune","string","uint","uint8",
  "uint16","uint32","uint64","uintptr","any",
]);

const BOOLS = new Set(["iota"]);
const NULLS = new Set(["nil"]);

export function tokenizeGo(source: string): Token[] {
  return tokenizeCLike(source, {
    keywords: KW,
    types: TYPES,
    bools: BOOLS,
    nulls: NULLS,
    backtickStrings: true,
  });
}
