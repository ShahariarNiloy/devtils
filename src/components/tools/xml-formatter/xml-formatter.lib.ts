/**
 * Pure XML-formatting lib. Wraps `fast-xml-parser`'s parse/build/validate
 * trio with lazy loading + a higher-level shape:
 *
 *   - `format(xml, options)`  → pretty-printed XML
 *   - `minify(xml)`           → single-line, comment-stripped, whitespace-collapsed
 *   - `xmlToJson(xml, opts)`  → JSON.stringified object (the standout feature)
 *   - `validate(xml)`         → discriminated result, no throw
 *   - `detectFlavor(xml)`     → infer SVG / SOAP / RSS / Atom / POM / Android / generic
 *   - `applyFlavor(opts, f)`  → derived presets per flavor
 *
 * fast-xml-parser runs in `preserveOrder: true` so attributes,
 * comments, CDATA, and processing instructions all round-trip
 * faithfully. The price is a slightly different internal shape (array
 * of single-key objects), but that's hidden from callers — only the lib
 * touches it.
 */

import type {
  XMLBuilder as XmlBuilder,
  XMLParser as XmlParser,
  XMLValidator as XmlValidator,
} from "fast-xml-parser";
import type * as FxpModuleNs from "fast-xml-parser";

type FxpModule = typeof FxpModuleNs;

let fxpPromise: Promise<FxpModule> | null = null;

function getFxp(): Promise<FxpModule> {
  if (!fxpPromise) fxpPromise = import("fast-xml-parser");
  return fxpPromise;
}

// ── Public types ───────────────────────────────────────────────────────

export type SelfClosingStyle = "preserve" | "expand" | "compact";
export type AttrLayout = "auto" | "always" | "never";
export type DeclarationMode = "preserve" | "strip" | "add";

export interface XmlFormatOptions {
  /** Spaces per indent level (1–8) or "tab". */
  indent?: number | "tab";
  /** Self-closing tag preference. */
  selfClosing?: SelfClosingStyle;
  /** Per-attribute line layout. */
  attributesPerLine?: AttrLayout;
  /** Keep `<!-- comments -->`. */
  keepComments?: boolean;
  /** Sort attributes alphabetically per element. */
  sortAttributes?: boolean;
  /** What to do with the `<?xml ?>` declaration. */
  declaration?: DeclarationMode;
  /** Strip `xmlns:…` namespace declarations from the output. */
  stripNamespaces?: boolean;
}

export type FormatResult =
  | { ok: true; output: string }
  | { ok: false; error: string; line?: number; column?: number };

export interface ValidationResult {
  ok: boolean;
  message?: string;
  line?: number;
  column?: number;
}

// ── Validation ─────────────────────────────────────────────────────────

export async function validate(xml: string): Promise<ValidationResult> {
  if (!xml.trim()) return { ok: true };
  try {
    const { XMLValidator } = await getFxp();
    const r = (XMLValidator as typeof XmlValidator).validate(xml);
    if (r === true) return { ok: true };
    return {
      ok: false,
      message: r.err.msg,
      line: r.err.line,
      column: r.err.col,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// ── Format ─────────────────────────────────────────────────────────────

const ATTR_PREFIX = "@_";
const COMMENT_KEY = "#comment";
const CDATA_KEY = "#cdata";

/**
 * Parse → optionally transform tree (sort attrs, strip namespaces, drop
 * comments) → rebuild with the requested whitespace shape.
 *
 * fast-xml-parser's pretty-print is good but lacks a few knobs users
 * routinely want (self-closing style, declaration handling, namespace
 * stripping), so we add those as post-passes on the rebuilt string.
 */
export async function format(
  xml: string,
  options: XmlFormatOptions = {},
): Promise<FormatResult> {
  if (!xml.trim()) return { ok: true, output: "" };

  const indent = options.indent ?? 2;
  const indentBy = indent === "tab" ? "\t" : " ".repeat(indent);

  const v = await validate(xml);
  if (!v.ok) {
    return {
      ok: false,
      error: v.message ?? "invalid XML",
      line: v.line,
      column: v.column,
    };
  }

  try {
    const { XMLParser, XMLBuilder } = await getFxp();
    const parser = new (XMLParser as typeof XmlParser)({
      ignoreAttributes: false,
      attributeNamePrefix: ATTR_PREFIX,
      preserveOrder: true,
      commentPropName: COMMENT_KEY,
      cdataPropName: CDATA_KEY,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
    });

    let tree = parser.parse(xml) as TreeNode[];

    if (!options.keepComments) tree = stripComments(tree);
    if (options.stripNamespaces) tree = stripXmlns(tree);
    if (options.sortAttributes) tree = sortAttrs(tree);

    // `suppressEmptyNode: true` emits `<foo/>` for empty elements;
    // `false` emits `<foo></foo>`. The compact form is most users'
    // expectation, so that's our default; opt-into expanded form
    // explicitly when callers want HTML-flavoured XML.
    const suppressEmpty = options.selfClosing !== "expand";
    const builder = new (XMLBuilder as typeof XmlBuilder)({
      attributeNamePrefix: ATTR_PREFIX,
      ignoreAttributes: false,
      preserveOrder: true,
      commentPropName: COMMENT_KEY,
      cdataPropName: CDATA_KEY,
      format: true,
      indentBy,
      suppressEmptyNode: suppressEmpty,
      processEntities: true,
    });
    let out = builder.build(tree) as string;

    // Declaration handling.
    if (options.declaration === "strip") {
      out = out.replace(/^<\?xml[^?>]*\?>\s*\n?/i, "");
    } else if (options.declaration === "add" && !/^<\?xml/i.test(out)) {
      out = `<?xml version="1.0" encoding="UTF-8"?>\n${out}`;
    }

    // Trim leading + trailing whitespace; the builder sometimes prepends
    // a blank line when no `<?xml ?>` declaration is present.
    return { ok: true, output: out.replace(/^\s+|\s+$/g, "") };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

// ── Minify ─────────────────────────────────────────────────────────────

/**
 * String-aware whitespace strip. Removes comments, collapses inter-tag
 * whitespace, but never touches characters inside text/CDATA/attribute
 * values. Cheap pass — no parser required.
 */
export function minify(xml: string): string {
  if (!xml.trim()) return "";
  const len = xml.length;
  const out: string[] = [];
  let i = 0;

  while (i < len) {
    // CDATA section — copy through verbatim.
    if (xml.startsWith("<![CDATA[", i)) {
      const end = xml.indexOf("]]>", i);
      if (end < 0) {
        out.push(xml.slice(i));
        break;
      }
      out.push(xml.slice(i, end + 3));
      i = end + 3;
      continue;
    }
    // Comment — drop entirely.
    if (xml.startsWith("<!--", i)) {
      const end = xml.indexOf("-->", i);
      if (end < 0) break;
      i = end + 3;
      continue;
    }
    // Tag — copy through, collapsing inner whitespace.
    if (xml.charCodeAt(i) === 60 /* < */) {
      const end = findTagEnd(xml, i);
      if (end < 0) {
        out.push(xml.slice(i));
        break;
      }
      out.push(collapseAttrWs(xml.slice(i, end + 1)));
      i = end + 1;
      continue;
    }
    // Text between tags — collapse runs of whitespace to a single space
    // (preserves single-space significance for mixed content like
    // `<a>x <b>y</b> z</a>`).
    const next = xml.indexOf("<", i);
    const segment = xml.slice(i, next < 0 ? len : next);
    const collapsed = segment.replace(/[\s\r\n]+/g, " ");
    // If the segment was entirely whitespace, drop it — inter-tag noise.
    if (collapsed.trim() === "") {
      // Drop
    } else {
      out.push(collapsed);
    }
    i = next < 0 ? len : next;
  }

  return out.join("").trim();
}

function findTagEnd(xml: string, start: number): number {
  // Naive but correct: scan forward, tracking quoted attribute values
  // so `>` inside `"…"` doesn't close the tag early.
  const len = xml.length;
  let inStr = 0;
  for (let i = start; i < len; i++) {
    const c = xml.charCodeAt(i);
    if (inStr) {
      if (c === inStr) inStr = 0;
      continue;
    }
    if (c === 34 || c === 39) inStr = c;
    else if (c === 62) return i;
  }
  return -1;
}

function collapseAttrWs(tag: string): string {
  // Collapse runs of inter-attribute whitespace to a single space.
  // Don't touch the content inside attribute-value quotes.
  const out: string[] = [];
  const len = tag.length;
  let inStr = 0;
  let lastWs = false;
  for (let i = 0; i < len; i++) {
    const c = tag.charCodeAt(i);
    if (inStr) {
      out.push(tag[i]);
      if (c === inStr) inStr = 0;
      continue;
    }
    if (c === 34 || c === 39) {
      out.push(tag[i]);
      inStr = c;
      lastWs = false;
      continue;
    }
    if (c === 32 || c === 9 || c === 10 || c === 13) {
      if (!lastWs) {
        out.push(" ");
        lastWs = true;
      }
      continue;
    }
    out.push(tag[i]);
    lastWs = false;
  }
  return out.join("");
}

// ── XML → JSON ─────────────────────────────────────────────────────────

export interface ToJsonOptions {
  /** Pretty-print spaces. */
  indent?: number;
  /** Prefix for attributes in the JSON output. `@` is the Mozilla convention. */
  attributePrefix?: string;
  /** Key for text nodes when an element has attributes + text. */
  textKey?: string;
}

/**
 * Convert XML to JSON. The mapping convention (Mozilla-ish):
 *
 *   <foo bar="1">hi</foo>  →  { "foo": { "@bar": "1", "#text": "hi" } }
 *   <list><a/><a/></list>  →  { "list": { "a": [ {}, {} ] } }
 *
 * Lossy in edge cases (mixed content, attribute / element name clash),
 * but the convention is the same one most tools use, so it round-trips
 * with `jsonToXml` for the common cases.
 */
export async function xmlToJson(
  xml: string,
  options: ToJsonOptions = {},
): Promise<FormatResult> {
  if (!xml.trim()) return { ok: true, output: "{}" };

  const v = await validate(xml);
  if (!v.ok) {
    return {
      ok: false,
      error: v.message ?? "invalid XML",
      line: v.line,
      column: v.column,
    };
  }

  try {
    const { XMLParser } = await getFxp();
    const attrPrefix = options.attributePrefix ?? "@";
    const textKey = options.textKey ?? "#text";
    const parser = new (XMLParser as typeof XmlParser)({
      ignoreAttributes: false,
      attributeNamePrefix: attrPrefix,
      textNodeName: textKey,
      // preserveOrder off — for the JSON view we want the natural object shape.
      preserveOrder: false,
      // Drop comments + processing instructions — they don't map cleanly to JSON.
      commentPropName: undefined,
      processEntities: true,
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
    });
    const obj = parser.parse(xml) as unknown;
    return { ok: true, output: JSON.stringify(obj, null, options.indent ?? 2) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Flavors ────────────────────────────────────────────────────────────

export type Flavor =
  | "auto"
  | "generic"
  | "svg"
  | "soap"
  | "rss"
  | "atom"
  | "pom"
  | "android";

export interface FlavorDef {
  id: Flavor;
  label: string;
  hint: string;
}

export const FLAVORS: ReadonlyArray<FlavorDef> = [
  { id: "auto", label: "Auto", hint: "detect from root" },
  { id: "generic", label: "Generic XML", hint: "ANSI defaults" },
  { id: "svg", label: "SVG", hint: "image/svg+xml" },
  { id: "soap", label: "SOAP", hint: "envelope/body" },
  { id: "rss", label: "RSS", hint: "channel/item" },
  { id: "atom", label: "Atom", hint: "feed/entry" },
  { id: "pom", label: "Maven POM", hint: "pom.xml" },
  { id: "android", label: "Android layout", hint: "res/layout/*.xml" },
];

/** Quick heuristic on the input head — root element + first xmlns. */
export function detectFlavor(xml: string): Exclude<Flavor, "auto"> {
  const head = xml.slice(0, 1200);
  if (/<svg\b/.test(head) && /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(head)) {
    return "svg";
  }
  if (/<(?:[a-z0-9]+:)?Envelope\b/i.test(head) && /soap/i.test(head)) {
    return "soap";
  }
  if (/<rss\b/.test(head)) return "rss";
  if (/<feed\b/.test(head) && /xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/.test(head)) {
    return "atom";
  }
  if (/<project\b/.test(head) && /xmlns="http:\/\/maven\.apache\.org\/POM/.test(head)) {
    return "pom";
  }
  if (/xmlns:android="http:\/\/schemas\.android\.com\/apk\/res\/android"/.test(head)) {
    return "android";
  }
  return "generic";
}

/**
 * Per-flavor defaults. Applied as a layer on top of the user's explicit
 * options — anything the user set wins. The Auto picker resolves to a
 * concrete flavor via `detectFlavor` before this runs.
 */
export function applyFlavor(
  options: XmlFormatOptions,
  flavor: Exclude<Flavor, "auto">,
): XmlFormatOptions {
  const layered: XmlFormatOptions = { ...options };
  switch (flavor) {
    case "svg":
      layered.indent ??= 2;
      layered.attributesPerLine ??= "auto";
      layered.declaration ??= "preserve";
      break;
    case "soap":
      layered.indent ??= 2;
      layered.attributesPerLine ??= "always";
      layered.keepComments ??= true;
      break;
    case "rss":
    case "atom":
      layered.indent ??= 2;
      layered.keepComments ??= true;
      layered.declaration ??= "preserve";
      break;
    case "pom":
      layered.indent ??= 4;
      layered.attributesPerLine ??= "never";
      layered.declaration ??= "preserve";
      break;
    case "android":
      layered.indent ??= 4;
      layered.attributesPerLine ??= "always";
      layered.declaration ??= "preserve";
      break;
    case "generic":
      layered.indent ??= 2;
      break;
  }
  return layered;
}

// ── Stats ──────────────────────────────────────────────────────────────

export interface XmlStats {
  inputLines: number;
  outputLines: number;
  inputChars: number;
  outputChars: number;
  elementCount: number;
  attributeCount: number;
  commentCount: number;
  maxDepth: number;
}

export function statsFor(input: string, output: string): XmlStats {
  let elementCount = 0;
  let attributeCount = 0;
  let commentCount = 0;
  let depth = 0;
  let maxDepth = 0;
  let i = 0;
  const len = output.length;
  while (i < len) {
    if (output.charCodeAt(i) !== 60) {
      i++;
      continue;
    }
    if (output.startsWith("<!--", i)) {
      commentCount++;
      const end = output.indexOf("-->", i);
      i = end < 0 ? len : end + 3;
      continue;
    }
    if (output.startsWith("<![CDATA[", i)) {
      const end = output.indexOf("]]>", i);
      i = end < 0 ? len : end + 3;
      continue;
    }
    if (output.charCodeAt(i + 1) === 63 || output.charCodeAt(i + 1) === 33) {
      // <?…?> or <!…> — skip without depth/element changes.
      const end = output.indexOf(">", i);
      i = end < 0 ? len : end + 1;
      continue;
    }
    const close = output.charCodeAt(i + 1) === 47;
    const end = findTagEnd(output, i);
    if (end < 0) break;
    const inner = output.slice(i + (close ? 2 : 1), end);
    const selfClosing = inner.endsWith("/");
    if (close) {
      depth = Math.max(0, depth - 1);
    } else {
      elementCount++;
      // Count attributes in this tag — every `name=` past the tag name
      // (cheap regex; we already escaped quoted values via findTagEnd).
      const attrMatches = inner.match(/\s[A-Za-z_][\w:.-]*\s*=/g);
      if (attrMatches) attributeCount += attrMatches.length;
      if (!selfClosing) {
        depth++;
        if (depth > maxDepth) maxDepth = depth;
      }
    }
    i = end + 1;
  }
  return {
    inputLines: input ? input.split(/\r\n|\r|\n/).length : 0,
    outputLines: output ? output.split(/\r\n|\r|\n/).length : 0,
    inputChars: input.length,
    outputChars: output.length,
    elementCount,
    attributeCount,
    commentCount,
    maxDepth,
  };
}

// ── Tree transformers (internal) ───────────────────────────────────────

/**
 * fast-xml-parser with `preserveOrder: true` produces an Array<Node>
 * where each Node is an object with exactly one element key (the tag
 * name) → array of children, plus optional `:@` attributes object. The
 * transformers below operate on this shape.
 */
interface AttrBag {
  [k: string]: string;
}

interface TreeNode {
  [key: string]: TreeNode[] | string | AttrBag | undefined;
  ":@"?: AttrBag;
}

function stripComments(tree: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  for (const node of tree) {
    if (COMMENT_KEY in node) continue;
    const fresh: TreeNode = { ...node };
    for (const k of Object.keys(fresh)) {
      const v = fresh[k];
      if (Array.isArray(v)) {
        (fresh as Record<string, unknown>)[k] = stripComments(v as TreeNode[]);
      }
    }
    out.push(fresh);
  }
  return out;
}

function stripXmlns(tree: TreeNode[]): TreeNode[] {
  return tree.map((node) => {
    const next: TreeNode = { ...node };
    const attrs = next[":@"];
    if (attrs && typeof attrs === "object") {
      const cleaned: AttrBag = {};
      for (const [k, v] of Object.entries(attrs)) {
        const real = k.startsWith(ATTR_PREFIX) ? k.slice(ATTR_PREFIX.length) : k;
        if (real === "xmlns" || real.startsWith("xmlns:")) continue;
        cleaned[k] = v;
      }
      if (Object.keys(cleaned).length === 0) {
        delete next[":@"];
      } else {
        next[":@"] = cleaned;
      }
    }
    for (const k of Object.keys(next)) {
      const v = next[k];
      if (Array.isArray(v)) {
        (next as Record<string, unknown>)[k] = stripXmlns(v as TreeNode[]);
      }
    }
    return next;
  });
}

function sortAttrs(tree: TreeNode[]): TreeNode[] {
  return tree.map((node) => {
    const next: TreeNode = { ...node };
    const attrs = next[":@"];
    if (attrs && typeof attrs === "object") {
      const sorted: AttrBag = {};
      for (const k of Object.keys(attrs).sort()) {
        sorted[k] = attrs[k];
      }
      next[":@"] = sorted;
    }
    for (const k of Object.keys(next)) {
      const v = next[k];
      if (Array.isArray(v)) {
        (next as Record<string, unknown>)[k] = sortAttrs(v as TreeNode[]);
      }
    }
    return next;
  });
}

