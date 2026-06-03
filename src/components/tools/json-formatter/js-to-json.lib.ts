/**
 * Permissive-JSON → strict-JSON converter. Single-pass state machine
 * that handles the five shapes most "paste a JS object" workflows hit:
 *
 *   1. Single-quoted strings        →  double-quoted
 *   2. Unquoted identifier keys     →  quoted
 *   3. Trailing commas in `{}`/`[]` →  dropped
 *   4. `//…\n` line comments        →  dropped
 *   5. `/​*…*​/` block comments       →  dropped
 *
 * Plus a small pre-pass: strip a leading `const|let|var <ident> =` and a
 * trailing `;` so a line copied from code becomes parseable. Plus a
 * decimal-edge normaliser (`.5` → `0.5`, `5.` → `5.0`) since `JSON.parse`
 * rejects those.
 *
 * After the transform pass we feed the result to native `JSON.parse` —
 * that's the actual spec implementation. We don't build an AST. The
 * caller gets back the formatted JSON string OR an honest parse error
 * for the cases we can't handle (variables, spreads, methods, computed
 * keys, hex literals, NaN/Infinity, TS annotations, etc.).
 */

const ID_START = /[A-Za-z_$]/;
const ID_CONT = /[A-Za-z0-9_$]/;

export type Transform =
  | "single-quotes"
  | "unquoted-keys"
  | "unquoted-values"
  | "trailing-commas"
  | "comments"
  | "decimals"
  | "assignment-prefix";

/** JS literals that are valid JSON values and must NOT be quoted. */
const JSON_LITERAL = new Set(["true", "false", "null"]);

export type JsToJsonResult =
  | { ok: true; output: string; transforms: Transform[] }
  | { ok: false; error: string; line?: number; column?: number };

type State = "normal" | "sq" | "dq" | "line_comment" | "block_comment";

export function tryJsToJson(input: string): JsToJsonResult {
  if (!input.trim()) {
    return { ok: false, error: "empty input" };
  }

  const transforms = new Set<Transform>();

  // ── Pre-pass: strip leading `const|let|var x = …` + trailing `;` ───
  let working = input.trim();
  const assignmentMatch = working.match(
    /^(?:const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*/,
  );
  if (assignmentMatch) {
    working = working.slice(assignmentMatch[0].length);
    transforms.add("assignment-prefix");
  }
  if (working.endsWith(";")) {
    working = working.slice(0, -1).trimEnd();
  }

  // ── State machine pass ────────────────────────────────────────────
  const out: string[] = [];
  const len = working.length;
  let i = 0;
  let state: State = "normal";

  while (i < len) {
    const c = working[i];

    if (state === "normal") {
      // Comments
      if (c === "/" && working[i + 1] === "/") {
        state = "line_comment";
        transforms.add("comments");
        i += 2;
        continue;
      }
      if (c === "/" && working[i + 1] === "*") {
        state = "block_comment";
        transforms.add("comments");
        i += 2;
        continue;
      }

      // Single-quoted string → convert to double
      if (c === "'") {
        out.push('"');
        state = "sq";
        transforms.add("single-quotes");
        i++;
        continue;
      }

      // Double-quoted string — pass through unchanged
      if (c === '"') {
        out.push('"');
        state = "dq";
        i++;
        continue;
      }

      // Trailing comma — drop if next non-whitespace is `}` or `]`
      if (c === ",") {
        let j = i + 1;
        while (j < len && /\s/.test(working[j])) j++;
        if (working[j] === "}" || working[j] === "]") {
          transforms.add("trailing-commas");
          i++;
          continue;
        }
      }

      // Leading-dot decimal `.5` → `0.5` (only when not preceded by a digit
      // — otherwise we'd corrupt `1.5` into `10.5`).
      if (c === "." && working[i + 1] && /\d/.test(working[i + 1])) {
        const prev = i > 0 ? working[i - 1] : "";
        if (!/\d/.test(prev)) {
          out.push("0.");
          transforms.add("decimals");
          i++;
          continue;
        }
      }

      // Trailing-dot decimal `5.` → `5.0` (digit run followed by `.` not
      // followed by another digit — that's the only case JSON.parse rejects).
      if (/\d/.test(c)) {
        let j = i;
        while (j < len && /\d/.test(working[j])) j++;
        if (working[j] === "." && (j + 1 >= len || !/\d/.test(working[j + 1]))) {
          out.push(`${working.slice(i, j + 1)}0`);
          transforms.add("decimals");
          i = j + 1;
          continue;
        }
        // Otherwise let the digit fall through to default emit.
      }

      // Identifier — look ahead for `:` to decide if it's a key
      if (ID_START.test(c)) {
        let j = i + 1;
        while (j < len && ID_CONT.test(working[j])) j++;
        const ident = working.slice(i, j);

        let k = j;
        while (k < len && /\s/.test(working[k])) k++;

        // `:` and not `::` (we'd never see `::` in JSON-shape paste anyway,
        // but a defensive check costs nothing)
        if (working[k] === ":" && working[k + 1] !== ":") {
          out.push(`"${ident}":`);
          transforms.add("unquoted-keys");
          i = k + 1;
          continue;
        }

        // Value position. JSON literals (true/false/null) pass through.
        // An unquoted bareword value (`{status: active}`) is the JS-object
        // pattern users hit most after unquoted keys — quote it as a string
        // rather than letting JSON.parse reject it.
        if (JSON_LITERAL.has(ident)) {
          out.push(ident);
        } else {
          out.push(`"${ident}"`);
          transforms.add("unquoted-values");
        }
        i = j;
        continue;
      }

      // Default: emit as-is
      out.push(c);
      i++;
      continue;
    }

    if (state === "sq") {
      if (c === "\\" && i + 1 < len) {
        const next = working[i + 1];
        // `\'` in single-quoted source → literal `'` in double-quoted output
        if (next === "'") {
          out.push("'");
          i += 2;
          continue;
        }
        // All other escapes pass through (`\\`, `\n`, `\t`, `\uXXXX`, …)
        out.push(c, next);
        i += 2;
        continue;
      }
      // Raw `"` inside single-quoted source → must be escaped in our `"` output
      if (c === '"') {
        out.push('\\"');
        i++;
        continue;
      }
      if (c === "'") {
        out.push('"');
        state = "normal";
        i++;
        continue;
      }
      if (c === "\n") {
        return {
          ok: false,
          error: "unterminated string literal",
          ...mapPos(working, i),
        };
      }
      out.push(c);
      i++;
      continue;
    }

    if (state === "dq") {
      if (c === "\\" && i + 1 < len) {
        out.push(c, working[i + 1]);
        i += 2;
        continue;
      }
      if (c === '"') {
        out.push('"');
        state = "normal";
        i++;
        continue;
      }
      if (c === "\n") {
        return {
          ok: false,
          error: "unterminated string literal",
          ...mapPos(working, i),
        };
      }
      out.push(c);
      i++;
      continue;
    }

    if (state === "line_comment") {
      if (c === "\n") {
        state = "normal";
        // Preserve the newline so post-transform error positions stay
        // close to the original line count.
        out.push("\n");
      }
      i++;
      continue;
    }

    if (state === "block_comment") {
      if (c === "*" && working[i + 1] === "/") {
        state = "normal";
        i += 2;
        continue;
      }
      i++;
      continue;
    }
  }

  if (state === "sq" || state === "dq") {
    return { ok: false, error: "unterminated string literal" };
  }
  if (state === "block_comment") {
    return { ok: false, error: "unterminated block comment" };
  }

  // ── Validate by running native JSON.parse on the cleaned output ────
  const cleaned = out.join("");
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return {
      ok: true,
      output: JSON.stringify(parsed, null, 2),
      transforms: Array.from(transforms),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const m = message.match(/position\s+(\d+)/);
    return {
      ok: false,
      error: message,
      ...(m ? mapPos(cleaned, Number(m[1])) : {}),
    };
  }
}

/** Convert a flat string position to 1-based (line, column). */
function mapPos(s: string, pos: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const max = Math.min(pos, s.length);
  for (let i = 0; i < max; i++) {
    if (s.charCodeAt(i) === 10) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/** Human-readable label for each transform, used in the banner UI. */
export const TRANSFORM_LABELS: Record<Transform, string> = {
  "assignment-prefix": "strip `const/let/var =`",
  "single-quotes": "single → double quotes",
  "unquoted-keys": "quote bare keys",
  "unquoted-values": "quote bare values",
  "trailing-commas": "drop trailing commas",
  comments: "strip comments",
  decimals: "normalise decimal edges",
};
