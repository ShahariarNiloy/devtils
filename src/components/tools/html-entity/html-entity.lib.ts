/**
 * Pure HTML entity helpers — no React, no DOM (so no innerHTML trick).
 *
 * Encoding escapes the five characters that matter in HTML text and
 * attributes (& < > " '), optionally every non-ASCII character too.
 * Decoding understands numeric (&#233; &#xE9;) and named entities from the
 * table below; anything unknown is left exactly as written and counted.
 */

export type EntityDirection = "encode" | "decode";

export interface EntityEncodeOptions {
  /** Escape every non-ASCII character as a numeric (or named) entity. */
  nonAscii: boolean;
  /** Prefer named entities (&copy;) over numeric (&#xA9;) where one exists. */
  preferNamed: boolean;
  /** Escape " and ' too. Needed in attributes; optional in text nodes. */
  quotes: boolean;
}

export interface EntityEncodeResult {
  output: string;
  escaped: number;
}

export interface EntityDecodeResult {
  output: string;
  decoded: number;
  /** Entity-shaped sequences we didn't recognise (left untouched). */
  unknown: string[];
  /** Numeric references outside Unicode or to surrogates/NUL (replaced with U+FFFD, per the HTML spec). */
  invalid: number;
}

export const ENTITY_SAMPLE = '<a href="/tools">Tools & tips</a> — café ©';

/** Common named entities (HTML 4 Latin-1, symbols, punctuation, Greek). */
export const NAMED: Readonly<Record<string, string>> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  iexcl: "¡", cent: "¢", pound: "£", curren: "¤", yen: "¥", brvbar: "¦", sect: "§", uml: "¨",
  copy: "©", ordf: "ª", laquo: "«", not: "¬", shy: "­", reg: "®", macr: "¯", deg: "°",
  plusmn: "±", sup2: "²", sup3: "³", acute: "´", micro: "µ", para: "¶", middot: "·", cedil: "¸",
  sup1: "¹", ordm: "º", raquo: "»", frac14: "¼", frac12: "½", frac34: "¾", iquest: "¿",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å", AElig: "Æ", Ccedil: "Ç",
  Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë", Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï",
  ETH: "Ð", Ntilde: "Ñ", Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö", times: "×",
  Oslash: "Ø", Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü", Yacute: "Ý", THORN: "Þ", szlig: "ß",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å", aelig: "æ", ccedil: "ç",
  egrave: "è", eacute: "é", ecirc: "ê", euml: "ë", igrave: "ì", iacute: "í", icirc: "î", iuml: "ï",
  eth: "ð", ntilde: "ñ", ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö", divide: "÷",
  oslash: "ø", ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü", yacute: "ý", thorn: "þ", yuml: "ÿ",
  OElig: "Œ", oelig: "œ", Scaron: "Š", scaron: "š", Yuml: "Ÿ", fnof: "ƒ", circ: "ˆ", tilde: "˜",
  ensp: " ", emsp: " ", thinsp: " ", zwnj: "‌", zwj: "‍", lrm: "‎", rlm: "‏",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", sbquo: "‚", ldquo: "“", rdquo: "”", bdquo: "„",
  dagger: "†", Dagger: "‡", bull: "•", hellip: "…", permil: "‰", prime: "′", Prime: "″",
  lsaquo: "‹", rsaquo: "›", oline: "‾", frasl: "⁄", euro: "€", trade: "™",
  larr: "←", uarr: "↑", rarr: "→", darr: "↓", harr: "↔", crarr: "↵",
  lArr: "⇐", uArr: "⇑", rArr: "⇒", dArr: "⇓", hArr: "⇔",
  forall: "∀", part: "∂", exist: "∃", empty: "∅", nabla: "∇", isin: "∈", notin: "∉", ni: "∋",
  prod: "∏", sum: "∑", minus: "−", lowast: "∗", radic: "√", prop: "∝", infin: "∞", ang: "∠",
  and: "∧", or: "∨", cap: "∩", cup: "∪", int: "∫", there4: "∴", sim: "∼", cong: "≅", asymp: "≈",
  ne: "≠", equiv: "≡", le: "≤", ge: "≥", sub: "⊂", sup: "⊃", nsub: "⊄", sube: "⊆", supe: "⊇",
  oplus: "⊕", otimes: "⊗", perp: "⊥", sdot: "⋅", loz: "◊", spades: "♠", clubs: "♣", hearts: "♥", diams: "♦",
  Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ", Epsilon: "Ε", Zeta: "Ζ", Eta: "Η", Theta: "Θ",
  Iota: "Ι", Kappa: "Κ", Lambda: "Λ", Mu: "Μ", Nu: "Ν", Xi: "Ξ", Omicron: "Ο", Pi: "Π", Rho: "Ρ",
  Sigma: "Σ", Tau: "Τ", Upsilon: "Υ", Phi: "Φ", Chi: "Χ", Psi: "Ψ", Omega: "Ω",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", omicron: "ο", pi: "π", rho: "ρ",
  sigmaf: "ς", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
};

/** Reverse table for "prefer named": char → name. First name wins (apos stays numeric for HTML4 safety). */
const NAME_FOR: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [name, ch] of Object.entries(NAMED)) {
    if (name === "apos") continue;
    if (!m.has(ch)) m.set(ch, name);
  }
  return m;
})();

const BASIC: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function encodeEntities(input: string, opts: EntityEncodeOptions): EntityEncodeResult {
  let out = "";
  let escaped = 0;
  // for…of walks code points, so an emoji becomes one entity, not two halves.
  for (const ch of input) {
    const basic = BASIC[ch];
    if (basic && (opts.quotes || (ch !== '"' && ch !== "'"))) {
      out += basic;
      escaped++;
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0;
    if (opts.nonAscii && cp > 0x7f) {
      const name = opts.preferNamed ? NAME_FOR.get(ch) : undefined;
      out += name ? `&${name};` : `&#x${cp.toString(16).toUpperCase()};`;
      escaped++;
      continue;
    }
    out += ch;
  }
  return { output: out, escaped };
}

const ENTITY_RE = /&(#[xX][0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g;

function fromCodePoint(cp: number): string | null {
  if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return null;
  if (cp >= 0xd800 && cp <= 0xdfff) return null;
  return String.fromCodePoint(cp);
}

export function decodeEntities(input: string): EntityDecodeResult {
  let decoded = 0;
  let invalid = 0;
  const unknown = new Set<string>();
  const output = input.replace(ENTITY_RE, (whole: string, body: string) => {
    if (body.startsWith("#")) {
      const hex = body[1] === "x" || body[1] === "X";
      const cp = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      const ch = fromCodePoint(cp);
      decoded++;
      if (ch === null) {
        invalid++;
        return "�";
      }
      return ch;
    }
    const named = Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : undefined;
    if (named !== undefined) {
      decoded++;
      return named;
    }
    unknown.add(whole);
    return whole;
  });
  return { output, decoded, unknown: [...unknown], invalid };
}

/** Heuristic: input contains entity references, so Decode is probably wanted. */
export function looksEscaped(s: string): boolean {
  return /&(#[xX][0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/.test(s) && !/[<>]/.test(s);
}
