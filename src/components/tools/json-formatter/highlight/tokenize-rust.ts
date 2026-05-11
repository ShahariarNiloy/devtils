import type { Token } from "./types";
import { tokenizeCLike } from "./tokenize-c-like";

const KW = new Set([
  "as","async","await","break","const","continue","crate","dyn","else",
  "enum","extern","fn","for","if","impl","in","let","loop","match","mod",
  "move","mut","pub","ref","return","self","Self","static","struct",
  "super","trait","type","unsafe","use","where","while","yield","try",
]);

const TYPES = new Set([
  "bool","char","str","String","i8","i16","i32","i64","i128","isize",
  "u8","u16","u32","u64","u128","usize","f32","f64","Vec","Option","Result",
  "Box","Rc","Arc","HashMap","HashSet","BTreeMap","BTreeSet",
]);

const NULLS = new Set(["None"]);

export function tokenizeRust(source: string): Token[] {
  return tokenizeCLike(source, {
    keywords: KW,
    types: TYPES,
    nulls: NULLS,
  });
}
