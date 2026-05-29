/**
 * MCP tool registry. Each entry wraps a pure function from one of the
 * `*.lib.ts` modules. The wrappers are intentionally thin — input
 * validation lives in the JSON Schema attached to each tool, so the
 * handler can rely on the right shape arriving.
 *
 * Scope of the first cut:
 *   - All 9 JSON converters (clean inputs, well-defined outputs).
 *   - Base64 encode / decode.
 *   - JWT decode.
 *   - Text case conversion.
 *   - Timestamp parse / format.
 *
 * Deliberately deferred:
 *   - Image compressor (binary I/O is awkward over JSON-RPC; needs base64
 *     wrapping that's mostly noise for the first cut).
 *   - Regex tester (structured output of nested match arrays needs a
 *     richer return type than a single content block).
 *   - Color converter (output is structurally multiple values across
 *     formats; bundle for a follow-up).
 */

import { encode as b64encode, decode as b64decode } from "@/components/tools/base64/base64.lib";
import { cases as caseDefs } from "@/components/tools/text-case/text-case.lib";
import {
  formatAll,
  parseInput as parseTimestamp,
} from "@/components/tools/timestamp-converter/timestamp-converter.lib";
import {
  toCSV,
  toGo,
  toJsonSchema,
  toPython,
  toRust,
  toTypeScript,
  toXML,
  toYAML,
  toZod,
} from "@/components/tools/json-formatter/json-convert";
import type { Tool, ToolCallResult } from "./protocol";

function text(s: string): ToolCallResult {
  return { content: [{ type: "text", text: s }] };
}

function err(message: string): ToolCallResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Parse the `arguments` field that JSON-RPC handed us, with a safety net. */
function asObject(args: unknown): Record<string, unknown> {
  if (args === undefined || args === null) return {};
  if (typeof args !== "object" || Array.isArray(args)) return {};
  return args as Record<string, unknown>;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseJsonSafe(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new Error(
      `invalid JSON input: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

// ── JSON converters ──────────────────────────────────────────────────────

const jsonInputSchema = {
  type: "object",
  required: ["json"],
  properties: {
    json: {
      type: "string",
      description: "JSON value to convert, as a string.",
    },
  },
} as const;

const TOOLS: Tool[] = [
  {
    name: "json_to_typescript",
    description:
      "Convert a JSON sample to TypeScript interfaces / types. Infers optional fields, named subtypes, and format hints (date-time, uuid, email).",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string", description: "JSON to convert." },
        rootName: { type: "string", default: "Root" },
        declarationStyle: { type: "string", enum: ["interface", "type"], default: "interface" },
        readonly: { type: "boolean", default: false },
        childrenFirst: { type: "boolean", default: true },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const result = toTypeScript(value, {
        rootName: typeof o.rootName === "string" ? o.rootName : "Root",
        declarationStyle: o.declarationStyle === "type" ? "type" : "interface",
        readonly: o.readonly === true,
        childrenFirst: o.childrenFirst !== false,
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_zod",
    description:
      "Convert a JSON sample to a Zod schema with z.infer type alias. Surfaces format refinements (.email, .uuid, .datetime).",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string" },
        rootName: { type: "string", default: "root" },
        strict: { type: "boolean", default: false },
        applyFormatRefinements: { type: "boolean", default: true },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const result = toZod(value, {
        rootName: typeof o.rootName === "string" ? o.rootName : "root",
        strict: o.strict === true,
        applyFormatRefinements: o.applyFormatRefinements !== false,
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_go",
    description:
      "Convert a JSON sample to Go struct definitions with json tags. Optional fields get pointer-with-omitempty.",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string" },
        packageName: { type: "string", default: "main" },
        jsonTagStyle: { type: "string", enum: ["original", "snake", "camel"], default: "original" },
        omitemptyOnOptional: { type: "boolean", default: true },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const result = toGo(value, {
        packageName: typeof o.packageName === "string" ? o.packageName : "main",
        jsonTagStyle:
          o.jsonTagStyle === "snake" || o.jsonTagStyle === "camel"
            ? o.jsonTagStyle
            : "original",
        omitemptyOnOptional: o.omitemptyOnOptional !== false,
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_python",
    description:
      "Convert a JSON sample to Python dataclasses, TypedDicts, or Pydantic v2 BaseModel classes.",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string" },
        classKind: { type: "string", enum: ["dataclass", "typeddict", "pydantic"], default: "dataclass" },
        useSlots: { type: "boolean", default: false },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const kind =
        o.classKind === "typeddict" || o.classKind === "pydantic"
          ? o.classKind
          : "dataclass";
      const result = toPython(value, {
        classKind: kind,
        useSlots: o.useSlots === true,
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_rust",
    description:
      "Convert a JSON sample to Rust serde structs with snake_case fields and Option<T> for optional / nullable.",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string" },
        extraDerives: { type: "array", items: { type: "string" } },
        denyUnknownFields: { type: "boolean", default: false },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const extra = Array.isArray(o.extraDerives)
        ? o.extraDerives.filter((s): s is string => typeof s === "string")
        : [];
      const result = toRust(value, {
        extraDerives: extra,
        denyUnknownFields: o.denyUnknownFields === true,
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_csv",
    description:
      "Convert a JSON array of objects to CSV. Configurable delimiter, dot-flattening for nested objects, header row, BOM, CRLF.",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string", description: "JSON array of objects." },
        delimiter: { type: "string", default: "," },
        flattenDelimiter: { type: "string", default: "." },
        includeHeader: { type: "boolean", default: true },
        bom: { type: "boolean", default: false },
        crlf: { type: "boolean", default: false },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const result = toCSV(value, {
        delimiter: typeof o.delimiter === "string" ? o.delimiter : ",",
        flattenDelimiter: typeof o.flattenDelimiter === "string" ? o.flattenDelimiter : ".",
        includeHeader: o.includeHeader !== false,
        bom: o.bom === true,
        newline: o.crlf === true ? "\r\n" : "\n",
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_yaml",
    description: "Convert JSON to YAML with configurable indent, line width, and key sorting.",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string" },
        indent: { type: "integer", default: 2 },
        lineWidth: { type: "integer", default: 120 },
        sortKeys: { type: "boolean", default: false },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const result = toYAML(value, {
        indent: typeof o.indent === "number" ? o.indent : 2,
        lineWidth: typeof o.lineWidth === "number" ? o.lineWidth : 120,
        sortKeys: o.sortKeys === true,
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_xml",
    description: "Convert any JSON value to XML with custom root tag, item tag for arrays, and XML declaration.",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string" },
        rootTag: { type: "string", default: "root" },
        itemTag: { type: "string", default: "item" },
        declaration: { type: "boolean", default: true },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const result = toXML(value, {
        rootTag: typeof o.rootTag === "string" ? o.rootTag : "root",
        itemTag: typeof o.itemTag === "string" ? o.itemTag : "item",
        declaration: o.declaration !== false,
      });
      return text(result.output);
    },
  },
  {
    name: "json_to_schema",
    description: "Infer a JSON Schema (draft 2020-12 or draft-07) from any sample document.",
    inputSchema: {
      type: "object",
      required: ["json"],
      properties: {
        json: { type: "string" },
        draft: { type: "string", enum: ["2020-12", "draft-07"], default: "2020-12" },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const value = parseJsonSafe(asString(o.json));
      const draft = o.draft === "draft-07" ? "draft-07" : "2020-12";
      const result = toJsonSchema(value, { draft });
      return text(result.output);
    },
  },

  // ── Base64 ─────────────────────────────────────────────────────────

  {
    name: "base64_encode",
    description: "Encode a UTF-8 string to Base64. Supports standard or URL-safe variants.",
    inputSchema: {
      type: "object",
      required: ["input"],
      properties: {
        input: { type: "string" },
        variant: { type: "string", enum: ["standard", "url-safe"], default: "standard" },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const input = asString(o.input);
      const variant = o.variant === "url-safe" ? "url-safe" : "standard";
      const result = b64encode(input, { variant, charset: "utf-8" });
      return text(result.output);
    },
  },
  {
    name: "base64_decode",
    description: "Decode a Base64 string to its original UTF-8 text. Auto-detects standard vs URL-safe.",
    inputSchema: {
      type: "object",
      required: ["input"],
      properties: {
        input: { type: "string" },
        variant: { type: "string", enum: ["standard", "url-safe"], default: "standard" },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const input = asString(o.input);
      const variant = o.variant === "url-safe" ? "url-safe" : "standard";
      try {
        const result = b64decode(input, {
          variant,
          charset: "utf-8",
          stripWhitespace: true,
          autoPad: true,
        });
        return text(result.output);
      } catch (e) {
        return err(
          `decode failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    },
  },

  // ── JWT ────────────────────────────────────────────────────────────

  {
    name: "jwt_decode",
    description: "Decode a JWT into its header and payload. Does NOT verify the signature.",
    inputSchema: {
      type: "object",
      required: ["token"],
      properties: { token: { type: "string" } },
    },
    handler: (args) => {
      const o = asObject(args);
      const token = asString(o.token).trim();
      const parts = token.split(".");
      if (parts.length !== 3) return err("not a valid JWT: expected three dot-separated segments");
      try {
        // JWT uses URL-safe base64 without padding. Atob expects padded
        // standard base64, so we patch both differences before decoding.
        const decode = (segment: string) => {
          const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
          const std = padded.replace(/-/g, "+").replace(/_/g, "/");
          if (typeof atob === "function") return atob(std);
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return Buffer.from(std, "base64").toString("utf-8");
        };
        const header = JSON.parse(decode(parts[0]));
        const payload = JSON.parse(decode(parts[1]));
        return text(
          JSON.stringify({ header, payload, signature: parts[2] }, null, 2),
        );
      } catch (e) {
        return err(`decode failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  },

  // ── Text case ──────────────────────────────────────────────────────

  {
    name: "text_case_convert",
    description:
      "Convert text between case formats (camelCase, snake_case, kebab-case, PascalCase, SCREAMING_SNAKE, Title Case, sentence case, and more).",
    inputSchema: {
      type: "object",
      required: ["input", "target"],
      properties: {
        input: { type: "string" },
        target: {
          type: "string",
          description: "Target case id — one of: " + caseDefs.map((c) => c.id).join(", "),
          enum: caseDefs.map((c) => c.id),
        },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const input = asString(o.input);
      const target = asString(o.target);
      const caseDef = caseDefs.find((c) => c.id === target);
      if (!caseDef) return err(`unknown target case: ${target}`);
      return text(caseDef.convert(input));
    },
  },

  // ── Timestamp ──────────────────────────────────────────────────────

  {
    name: "timestamp_convert",
    description:
      "Parse a Unix timestamp (seconds/ms/µs) or ISO 8601 string and return every common representation: ISO, RFC 2822, Unix s/ms/µs.",
    inputSchema: {
      type: "object",
      required: ["input"],
      properties: {
        input: {
          type: "string",
          description: "Unix timestamp or ISO 8601 string.",
        },
        timezone: {
          type: "string",
          description: "IANA timezone name (e.g. 'Europe/London'). Defaults to UTC.",
          default: "UTC",
        },
      },
    },
    handler: (args) => {
      const o = asObject(args);
      const input = asString(o.input);
      const tz = typeof o.timezone === "string" ? o.timezone : "UTC";
      const parsed = parseTimestamp(input);
      if (!parsed.ok || !parsed.instant) {
        return err(`parse failed: ${parsed.error ?? "unknown reason"}`);
      }
      const formats = formatAll(parsed.instant, tz, "YYYY-MM-DD HH:mm:ss");
      return text(
        JSON.stringify(
          { detectedFormat: parsed.detectedFormat, formats },
          null,
          2,
        ),
      );
    },
  },
];

export function listTools(): Tool[] {
  return TOOLS;
}

export function findTool(name: string): Tool | undefined {
  return TOOLS.find((t) => t.name === name);
}

// `jsonInputSchema` is exported for any future caller that wants a shared
// schema reference. Kept named so it doesn't read as dead code.
export { jsonInputSchema };
