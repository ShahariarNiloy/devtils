/**
 * Five-field cron (Vixie / POSIX flavour): parse, describe in plain words,
 * and compute upcoming run times in the local time zone. Pure — callers
 * pass `now`.
 *
 * Supported: `*`, numbers, ranges `a-b`, steps `/n` (on `*`, ranges or a
 * single start value), lists `a,b`, month and weekday names (JAN, MON),
 * weekday 7 as Sunday, `?` as `*`, and the @yearly/@monthly/@weekly/@daily/
 * @hourly macros. Day-of-month and day-of-week follow Vixie cron: when both
 * are restricted (neither starts with `*`) a day matches if EITHER does.
 */

export const FIELD_KEYS = ["Minute", "Hour", "Day", "Month", "Weekday"] as const;

interface FieldSpec {
  min: number;
  max: number;
  name: string;
  names?: readonly string[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const SPECS: readonly FieldSpec[] = [
  { min: 0, max: 59, name: "minute" },
  { min: 0, max: 23, name: "hour" },
  { min: 1, max: 31, name: "day of month" },
  { min: 1, max: 12, name: "month", names: MONTHS },
  { min: 0, max: 7, name: "day of week", names: DAYS },
];

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

export const PRESETS: readonly { expr: string; label: string }[] = [
  { expr: "*/5 * * * *", label: "Every 5 min" },
  { expr: "0 * * * *", label: "Hourly" },
  { expr: "0 9 * * *", label: "Daily 09:00" },
  { expr: "30 9 * * 1-5", label: "Weekdays 09:30" },
  { expr: "0 0 1 * *", label: "Monthly" },
  { expr: "0 3 * * 0", label: "Sundays 03:00" },
];

export interface CronField {
  /** Source text of the field. */
  raw: string;
  /** Sorted, de-duplicated matching values. */
  values: number[];
  /** Field begins with `*` (Vixie's "star" flag — affects day matching). */
  star: boolean;
}

export interface ParsedCron {
  /** The five fields after macro expansion. */
  fields: [CronField, CronField, CronField, CronField, CronField];
  /** Original text was a macro (e.g. @daily). */
  macro: string | null;
}

export type ParseResult = { ok: true; cron: ParsedCron } | { ok: false; error: string };

/** Highest value `*` covers (weekday 7 is an alias of 0, so `*` stops at 6). */
const topOf = (spec: FieldSpec) => (spec.name === "day of week" ? 6 : spec.max);

function parseValue(token: string, spec: FieldSpec): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  if (spec.names) {
    const i = spec.names.findIndex((n) => n.toLowerCase() === token.toLowerCase());
    if (i >= 0) return spec.name === "month" ? i + 1 : i;
  }
  return null;
}

function parseField(raw: string, spec: FieldSpec): { ok: true; field: CronField } | { ok: false; error: string } {
  const set = new Set<number>();
  const text = raw === "?" ? "*" : raw;
  for (const part of text.split(",")) {
    const m = /^(\*|[A-Za-z0-9]+)(?:-([A-Za-z0-9]+))?(?:\/(\d+))?$/.exec(part);
    if (!m) return { ok: false, error: `Can't read “${part || raw}” in the ${spec.name} field` };
    const [, startTok, endTok, stepTok] = m;
    let start: number;
    let end: number;
    if (startTok === "*") {
      if (endTok !== undefined) return { ok: false, error: `Can't read “${part}” in the ${spec.name} field` };
      start = spec.min;
      end = topOf(spec);
    } else {
      const s = parseValue(startTok, spec);
      if (s === null) return { ok: false, error: `Can't read “${startTok}” in the ${spec.name} field` };
      start = s;
      if (endTok !== undefined) {
        const e = parseValue(endTok, spec);
        if (e === null) return { ok: false, error: `Can't read “${endTok}” in the ${spec.name} field` };
        end = e;
      } else {
        // "5/15" means "from 5, every 15" to the end of the range.
        end = stepTok === undefined ? start : topOf(spec);
      }
    }
    const step = stepTok !== undefined ? Number(stepTok) : 1;
    if (step < 1) return { ok: false, error: `The step in the ${spec.name} field must be at least 1` };
    if (start < spec.min || end > spec.max || start > spec.max) {
      const max = spec.name === "day of week" ? "7 (both 0 and 7 are Sunday)" : String(spec.max);
      return { ok: false, error: `The ${spec.name} field must be between ${spec.min} and ${max}` };
    }
    if (start > end) return { ok: false, error: `The range “${part}” in the ${spec.name} field runs backwards` };
    for (let v = start; v <= end; v += step) set.add(spec.name === "day of week" && v === 7 ? 0 : v);
  }
  return { ok: true, field: { raw, values: [...set].sort((a, b) => a - b), star: text.startsWith("*") } };
}

export function parseCron(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Type a cron expression, like 30 9 * * 1-5" };
  let expr = trimmed;
  let macro: string | null = null;
  if (trimmed.startsWith("@")) {
    const key = trimmed.toLowerCase();
    if (key === "@reboot") return { ok: false, error: "@reboot runs once at startup, so it has no schedule to show" };
    const expanded = MACROS[key];
    if (!expanded) return { ok: false, error: `Unknown macro “${trimmed}”. Try @hourly, @daily, @weekly, @monthly or @yearly` };
    expr = expanded;
    macro = key;
  }
  const parts = expr.split(/\s+/);
  if (parts.length === 6) return { ok: false, error: "That has 6 fields. This parser reads standard 5-field cron (no seconds or year)" };
  if (parts.length !== 5) return { ok: false, error: "A cron expression has 5 fields: minute hour day month weekday" };
  const fields: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    const r = parseField(parts[i], SPECS[i]);
    if (!r.ok) return r;
    fields.push(r.field);
  }
  const [mi, h, dom, mon, dow] = fields;
  return { ok: true, cron: { fields: [mi, h, dom, mon, dow], macro } };
}

/* ── Plain words ─────────────────────────────────────────────────────── */

const pad2 = (n: number) => String(n).padStart(2, "0");

const isAll = (f: CronField, spec: FieldSpec) => f.values.length === topOf(spec) - spec.min + 1;

const stepOf = (raw: string): number | null => {
  const m = /^\*\/(\d+)$/.exec(raw);
  return m ? Number(m[1]) : null;
};

/** [1,2,3,5] → ["1–3", "5"], labels via `name`. */
function compress(values: readonly number[], name: (v: number) => string = String): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < values.length) {
    let j = i;
    while (j + 1 < values.length && values[j + 1] === values[j] + 1) j++;
    if (j - i >= 2) out.push(`${name(values[i])}–${name(values[j])}`);
    else for (let k = i; k <= j; k++) out.push(name(values[k]));
    i = j + 1;
  }
  return out;
}

const joinList = (items: readonly string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const isContiguous = (v: readonly number[]) => v.length > 1 && v[v.length - 1] - v[0] === v.length - 1;

function timePhrase(c: ParsedCron): string {
  const [mF, hF] = c.fields;
  const mins = mF.values;
  const hrs = hF.values;
  const allMin = isAll(mF, SPECS[0]);
  const allHr = isAll(hF, SPECS[1]);
  const mStep = stepOf(mF.raw);
  const hStep = stepOf(hF.raw);
  const hourSpan = () =>
    isContiguous(hrs) ? `from ${pad2(hrs[0])}:00 to ${pad2(hrs[hrs.length - 1])}:59` : `during hours ${joinList(compress(hrs, pad2))}`;

  if (allMin && allHr) return "Every minute";
  if (allMin) return hrs.length === 1 ? `Every minute from ${pad2(hrs[0])}:00 to ${pad2(hrs[0])}:59` : `Every minute ${hourSpan()}`;
  if (mStep && allHr) return `Every ${mStep} minutes`;
  if (mStep) return `Every ${mStep} minutes ${hourSpan()}`;
  if (allHr) {
    if (mins.length === 1 && mins[0] === 0) return "Every hour, on the hour";
    return `At minute ${joinList(compress(mins))} of every hour`;
  }
  if (hStep && mins.length === 1) return `Every ${hStep} hours at :${pad2(mins[0])}`;
  if (mins.length === 1 && hrs.length <= 4) return `At ${joinList(hrs.map((h) => `${pad2(h)}:${pad2(mins[0])}`))}`;
  if (mins.length === 1 && isContiguous(hrs)) return `Every hour at :${pad2(mins[0])} from ${pad2(hrs[0])}:${pad2(mins[0])} to ${pad2(hrs[hrs.length - 1])}:${pad2(mins[0])}`;
  return `At minute ${joinList(compress(mins))} past hour ${joinList(compress(hrs))}`;
}

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
};

function weekdayPhrase(f: CronField): string {
  const v = f.values.join(",");
  if (v === "1,2,3,4,5") return "on weekdays";
  if (v === "0,6") return "on weekends";
  // Monday-first reads naturally ("Mon–Sun"); keep Sunday last when it rounds out a run.
  if (f.values.length === 1) return `on ${DAY_NAMES[f.values[0]]}s`;
  const monFirst = [...f.values].map((d) => (d === 0 ? 7 : d)).sort((a, b) => a - b);
  return `on ${joinList(compress(monFirst, (d) => DAYS[d % 7]))}`;
}

function monthDayPhrase(f: CronField): string {
  const step = stepOf(f.raw);
  if (step) return step === 2 ? "on every other day of the month" : `every ${step} days from the 1st of the month`;
  return `on the ${joinList(compress(f.values, ordinal))} of the month`;
}

/** One sentence, e.g. "At 09:30 on weekdays." */
export function describeCron(c: ParsedCron): string {
  const [, , dom, mon, dow] = c.fields;
  const parts = [timePhrase(c)];
  const domR = !isAll(dom, SPECS[2]);
  const dowR = !isAll(dow, SPECS[4]);
  if (!dom.star && !dow.star) {
    // Vixie: either field matching is enough, so an unrestricted one means every day.
    if (domR && dowR) parts.push(`${monthDayPhrase(dom)}, or ${weekdayPhrase(dow)}`);
  } else {
    if (dowR) parts.push(weekdayPhrase(dow));
    if (domR) parts.push(monthDayPhrase(dom));
  }
  if (!isAll(mon, SPECS[3])) parts.push(`in ${joinList(compress(mon.values, (m) => MONTHS[m - 1]))}`);
  return `${parts.join(" ")}.`;
}

export interface FieldSummary {
  key: (typeof FIELD_KEYS)[number];
  value: string;
  detail: string;
}

/** Per-field cards: raw value + a short reading ("every", "Mon–Fri"). */
export function summarizeFields(c: ParsedCron): FieldSummary[] {
  return c.fields.map((f, i) => {
    const spec = SPECS[i];
    let detail: string;
    const step = stepOf(f.raw);
    if (isAll(f, spec)) detail = "every";
    else if (step) detail = `every ${step}`;
    else {
      const namers: Record<number, (v: number) => string> = { 3: (m) => MONTHS[m - 1], 4: (d) => DAYS[d % 7] };
      const name = namers[i] ?? String;
      const vals = i === 4 ? [...f.values].map((d) => (d === 0 ? 7 : d)).sort((a, b) => a - b) : f.values;
      const items = compress(vals, name);
      detail = items.length > 3 ? `${items.slice(0, 3).join(", ")}…` : items.join(", ");
    }
    return { key: FIELD_KEYS[i], value: f.raw, detail };
  });
}

/* ── Next runs ───────────────────────────────────────────────────────── */

/** Look far enough ahead to find Feb 29 schedules (leap years) — 8 years of days. */
const SEARCH_DAYS = 366 * 8 + 2;

export function nextRuns(c: ParsedCron, now: Date, count: number): Date[] {
  const [mF, hF, dom, mon, dow] = c.fields;
  const months = new Set(mon.values);
  const doms = new Set(dom.values);
  const dows = new Set(dow.values);
  const either = !dom.star && !dow.star;

  const start = new Date(now.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);
  const out: Date[] = [];

  for (let d = 0; d < SEARCH_DAYS && out.length < count; d++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
    if (!months.has(day.getMonth() + 1)) continue;
    const domOK = doms.has(day.getDate());
    const dowOK = dows.has(day.getDay());
    if (either ? !(domOK || dowOK) : !(domOK && dowOK)) continue;
    for (const h of hF.values) {
      for (const m of mF.values) {
        const cand = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
        // Skip wall-clock times that don't exist (DST spring-forward gap).
        if (cand.getHours() !== h || cand.getMinutes() !== m) continue;
        if (cand < start) continue;
        out.push(cand);
        if (out.length >= count) return out;
      }
    }
  }
  return out;
}

/** "Mon 23 Nov · 09:30" */
export function formatRun(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "in 12 min", "in 5 h", "in 3 days". */
export function relativeTime(d: Date, now: Date): string {
  const s = (d.getTime() - now.getTime()) / 1000;
  if (s < 3600) return `in ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400 * 2) return `in ${Math.round(s / 3600)} h`;
  const days = Math.round(s / 86400);
  if (days < 366) return `in ${days} days`;
  const years = Math.round(days / 365.25);
  return years === 1 ? "in 1 year" : `in ${years} years`;
}
