/**
 * UUID v4 / v7 (RFC 9562) and ULID generation + anatomy. Pure: randomness
 * comes from an injectable `fill` (defaults to crypto.getRandomValues).
 */

export type IdKind = "v4" | "v7" | "ulid";

export const ID_KINDS: readonly { value: IdKind; label: string }[] = [
  { value: "v4", label: "UUID v4" },
  { value: "v7", label: "UUID v7" },
  { value: "ulid", label: "ULID" },
];

export const KIND_LABEL: Record<IdKind, string> = { v4: "UUID v4", v7: "UUID v7", ulid: "ULID" };

export const MIN_COUNT = 1;
export const MAX_COUNT = 20;

export type FillRandom = (buf: Uint8Array) => void;

const defaultFill: FillRandom = (buf) => {
  globalThis.crypto.getRandomValues(buf);
};

/** Crockford base32, as used by ULID. */
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MAX_TIME = 2 ** 48 - 1;

function hex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

function uuidFromBytes(b: Uint8Array): string {
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function uuidV4(fill: FillRandom = defaultFill): string {
  const b = new Uint8Array(16);
  fill(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return uuidFromBytes(b);
}

export function uuidV7(ms: number, fill: FillRandom = defaultFill): string {
  const b = new Uint8Array(16);
  fill(b);
  let t = Math.max(0, Math.min(MAX_TIME, Math.floor(ms)));
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  return uuidFromBytes(b);
}

export function ulid(ms: number, fill: FillRandom = defaultFill): string {
  let t = Math.max(0, Math.min(MAX_TIME, Math.floor(ms)));
  let time = "";
  for (let i = 0; i < 10; i++) {
    time = B32[t % 32] + time;
    t = Math.floor(t / 32);
  }
  // 16 bytes → 16 chars; 256 is a multiple of 32, so `% 32` is unbiased (80 bits).
  const b = new Uint8Array(16);
  fill(b);
  let rand = "";
  for (const x of b) rand += B32[x % 32];
  return time + rand;
}

/**
 * A batch of canonical IDs (lowercase UUIDs, uppercase ULIDs). Every ID in a
 * batch carries the real current timestamp; time-ordered kinds are sorted so
 * the list is in the same order a database index would keep them.
 */
export function generateIds(kind: IdKind, count: number, now: number = Date.now(), fill: FillRandom = defaultFill): string[] {
  const n = Math.max(0, Math.floor(count));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    if (kind === "v4") out.push(uuidV4(fill));
    else out.push(kind === "v7" ? uuidV7(now, fill) : ulid(now, fill));
  }
  if (kind !== "v4") out.sort();
  return out;
}

export interface DisplayOptions {
  uppercase: boolean;
  noHyphens: boolean;
}

export function formatId(id: string, kind: IdKind, opts: DisplayOptions): string {
  if (kind === "ulid") return id; // ULIDs are canonically uppercase, no hyphens
  const v = opts.noHyphens ? id.replace(/-/g, "") : id;
  return opts.uppercase ? v.toUpperCase() : v.toLowerCase();
}

/* ── Anatomy ─────────────────────────────────────────────────────────── */

export type IdPart = "time" | "version" | "variant" | "random" | "sep";

export interface AnatomySegment {
  text: string;
  part: IdPart;
}

export interface AnatomyLegend {
  part: IdPart;
  label: string;
  detail: string;
}

export interface Anatomy {
  kind: IdKind;
  segments: AnatomySegment[];
  legend: AnatomyLegend[];
  /** Embedded creation time (v7, ULID). */
  timestamp: number | null;
}

function iso(ms: number): string {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "invalid time" : d.toISOString();
}

export function decodeUlidTime(id: string): number {
  let t = 0;
  for (let i = 0; i < 10; i++) t = t * 32 + B32.indexOf(id[i].toUpperCase());
  return t;
}

/** Splits a canonical (hyphenated) ID into its labelled parts. */
export function anatomyOf(id: string, kind: IdKind): Anatomy {
  if (kind === "ulid") {
    const ts = decodeUlidTime(id);
    return {
      kind,
      timestamp: ts,
      segments: [
        { text: id.slice(0, 10), part: "time" },
        { text: id.slice(10), part: "random" },
      ],
      legend: [
        { part: "time", label: "Time", detail: `48-bit ms timestamp · ${iso(ts)}` },
        { part: "random", label: "Randomness", detail: "80 random bits — sortable by creation time" },
      ],
    };
  }
  const f = id.toLowerCase();
  // Hex digit index (hyphens skipped) → part. 0–11 time on v7; 12 version; 16 variant.
  const partAt = (hexIndex: number): IdPart => {
    if (hexIndex === 12) return "version";
    if (hexIndex === 16) return "variant";
    if (kind === "v7" && hexIndex < 12) return "time";
    return "random";
  };
  const segments: AnatomySegment[] = [];
  let hexIndex = 0;
  for (const ch of f) {
    const part: IdPart = ch === "-" ? "sep" : partAt(hexIndex++);
    const last = segments[segments.length - 1];
    if (last && last.part === part) last.text += ch;
    else segments.push({ text: ch, part });
  }
  const variant: AnatomyLegend = { part: "variant", label: "Variant", detail: "RFC 9562 variant bits (10xx)" };
  if (kind === "v7") {
    const ts = parseInt(f.replace(/-/g, "").slice(0, 12), 16);
    return {
      kind,
      timestamp: ts,
      segments,
      legend: [
        { part: "time", label: "Time", detail: `48-bit ms timestamp · ${iso(ts)}` },
        { part: "version", label: "Version", detail: "7 — time-ordered, great for database keys" },
        variant,
        { part: "random", label: "Random", detail: "74 random bits" },
      ],
    };
  }
  return {
    kind,
    timestamp: null,
    segments,
    legend: [
      { part: "version", label: "Version", detail: "4 — fully random" },
      variant,
      { part: "random", label: "Random", detail: "122 random bits — no ordering" },
    ],
  };
}

/* ── Inspect a pasted ID ─────────────────────────────────────────────── */

export type InspectResult =
  | { ok: true; kind: IdKind; canonical: string; anatomy: Anatomy }
  | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const ULID_RE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

/** Recognises a pasted UUID v4 / v7 or ULID; other UUID versions are named but not dissected. */
export function inspectId(input: string): InspectResult {
  const s = input.trim().replace(/^\{|\}$/g, "").replace(/^urn:uuid:/i, "");
  if (!s) return { ok: false, error: "Paste a UUID or ULID" };
  if (ULID_RE.test(s)) {
    const canonical = s.toUpperCase();
    return { ok: true, kind: "ulid", canonical, anatomy: anatomyOf(canonical, "ulid") };
  }
  if (UUID_RE.test(s)) {
    const h = s.replace(/-/g, "").toLowerCase();
    const canonical = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    const version = h[12];
    if (version === "4") return { ok: true, kind: "v4", canonical, anatomy: anatomyOf(canonical, "v4") };
    if (version === "7") return { ok: true, kind: "v7", canonical, anatomy: anatomyOf(canonical, "v7") };
    if (/^0+$/.test(h)) return { ok: false, error: "That's the nil UUID (all zeros)" };
    return { ok: false, error: `That's a valid UUID v${parseInt(version, 16)}. Only v4, v7 and ULID are dissected here.` };
  }
  if (s.length === 26) return { ok: false, error: "Looks like a ULID, but it has characters outside Crockford base32" };
  return { ok: false, error: "Not a UUID (32 hex digits) or a ULID (26 base32 characters)" };
}
