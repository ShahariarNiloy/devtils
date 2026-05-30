/**
 * Token-stream model shared by every tokenizer. The renderer in
 * `tokens-to-html.ts` walks a Token[] once, emitting class-tagged spans for
 * `tok-*` token types and bare text for `ws`. Keeping the model tiny makes
 * adding a language a function-sized exercise.
 */

export type TokenType =
  /** Whitespace — emitted bare, no span. */
  | "ws"
  /** Punctuation: `,` `:` `;` `[` `]` `{` `}` `(` `)`. */
  | "punct"
  /** Operator: `=` `+` `&&` `?.` etc. */
  | "op"
  /** Keyword: `function`, `class`, `def`, `let`, `const`, `fn`, `package`, … */
  | "kw"
  /** Built-in type / annotation: `string`, `i64`, `List[str]`, `int`. */
  | "type"
  /** Boolean literal. */
  | "bool"
  /** Null-like literal: `null`, `None`, `nil`, `undefined`. */
  | "null"
  /** Numeric literal. */
  | "number"
  /** String literal (including its quotes). */
  | "string"
  /** Object / map key (JSON / TS shorthand). */
  | "key"
  /** Single-line or block comment. */
  | "comment"
  /** XML / HTML tag name. */
  | "tag"
  /** XML / HTML attribute name. */
  | "attr"
  /** Variable / function / identifier (default fallback). */
  | "ident"
  /** Decorator / annotation marker (`@Override`, `@dataclass`). */
  | "decorator";

export interface Token {
  type: TokenType;
  value: string;
}

/** Tokenizer signature — pure function over the input string. */
export type Tokenizer = (source: string) => Token[];

export type Lang =
  | "json"
  | "yaml"
  | "xml"
  | "typescript"
  | "python"
  | "go"
  | "rust"
  | "csv"
  | "css"
  | "markdown"
  | "graphql"
  | "plain";
