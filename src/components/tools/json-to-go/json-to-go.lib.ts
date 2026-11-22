/**
 * Post-processing for the shared Go emitter (pure, no React): root type
 * rename, optional package clause, Go initialisms and gofmt-style column
 * alignment of struct fields.
 */

export const GO_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

const INITIALISMS: Record<string, string> = {
  Api: "API", Css: "CSS", Html: "HTML", Http: "HTTP", Https: "HTTPS", Id: "ID",
  Ip: "IP", Json: "JSON", Sql: "SQL", Uri: "URI", Url: "URL", Uuid: "UUID", Xml: "XML",
};

/** `UserId` → `UserID`, `AvatarUrl` → `AvatarURL` (Go naming convention). */
export function goInitialisms(name: string): string {
  return name.replace(/[A-Z][a-z0-9]*/g, (w) => INITIALISMS[w] ?? w);
}

/** Exported Go identifier for the root type; falls back to `Root`. */
export function safeGoTypeName(name: string): string {
  const t = name.trim();
  if (!GO_IDENT.test(t)) return "Root";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** `\tName Type `tag` // note` — the tag may be a raw or an interpreted literal. */
const FIELD = /^\t(\S+) (\S+)(?: (`[^`]*`|"(?:[^"\\]|\\.)*"))?( \/\/ .*)?$/;

/** Initialisms + gofmt-like alignment for each struct's field block. */
export function polishGoStructs(go: string): string {
  const lines = go.split("\n");
  const out: string[] = [];
  let block: { name: string; type: string; tag?: string; note?: string }[] = [];

  const flush = () => {
    if (!block.length) return;
    const taken = new Set(block.map((f) => f.name));
    const fields = block.map((f) => {
      const renamed = goInitialisms(f.name);
      if (renamed !== f.name && !taken.has(renamed)) {
        taken.add(renamed);
        return { ...f, name: renamed };
      }
      return f;
    });
    const w0 = Math.max(...fields.map((f) => f.name.length));
    const w1 = Math.max(...fields.map((f) => f.type.length));
    for (const f of fields) {
      const line = f.tag
        ? `\t${f.name.padEnd(w0)} ${f.type.padEnd(w1)} ${f.tag}`
        : `\t${f.name.padEnd(w0)} ${f.type}`.trimEnd();
      out.push(f.note ? `${line}${f.note}` : line);
    }
    block = [];
  };

  for (const line of lines) {
    const m = line.match(FIELD);
    if (m) {
      block.push({ name: m[1], type: m[2], tag: m[3], note: m[4] });
      continue;
    }
    flush();
    out.push(line);
  }
  flush();
  return out.join("\n");
}

export interface GoPostOptions {
  packageLine: boolean;
}

/**
 * The root type name is applied by the emitter (`toGo({ rootName })`), which
 * resolves collisions with nested structs — a textual `type Root` rename here
 * would declare `type User struct` twice for `{"user": {…}}` with root `User`.
 */
export function postProcessGo(go: string, { packageLine }: GoPostOptions): string {
  let s = polishGoStructs(go);
  if (!packageLine) s = s.replace(/^package \w+\n+/, "");
  return s;
}

export function countGoTypes(go: string): number {
  return (go.match(/^type \w+ /gm) ?? []).length;
}
