/**
 * Fixture-based regression tests for the JSON converter codegen pipeline.
 * Runs as a single script via `npx tsx <this file>` — exits 0 on success,
 * non-zero on any failed assertion with a diff dump.
 *
 * Each fixture asserts a single observable property (an output substring or
 * a structural check) rather than full string equality. Whole-output
 * snapshots churn too aggressively on cosmetic emitter changes, while
 * substring asserts catch the specific behaviour we care about (nullable
 * detection, format hints, optional inference, naming, dedup) without
 * locking down formatting choices.
 *
 * Run: npx tsx src/components/tools/json-formatter/codegen/__tests__/emitters.test.ts
 */

/* eslint-disable no-console */

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
} from "../../json-convert";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, hint?: string) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}`);
    if (hint) console.error(`      ${hint}`);
  }
}

function assertIncludes(label: string, haystack: string, needle: string) {
  check(
    label,
    haystack.includes(needle),
    `expected output to include \`${needle}\`, got:\n${haystack}`,
  );
}

function assertNotIncludes(label: string, haystack: string, needle: string) {
  check(
    label,
    !haystack.includes(needle),
    `expected output to NOT include \`${needle}\`, got:\n${haystack}`,
  );
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ────────────────────────────────────────────────────────────────────────────
//  TypeScript
// ────────────────────────────────────────────────────────────────────────────
section("TypeScript");

{
  const out = toTypeScript({ name: "x", age: 1 }).output;
  assertIncludes("emits an interface for root objects", out, "export interface Root");
  assertIncludes("primitive string maps to `string`", out, "name: string");
  assertIncludes("primitive number maps to `number`", out, "age: number");
}

{
  const out = toTypeScript({ user: { name: "x" } }).output;
  assertIncludes("nested objects get named interfaces", out, "interface User");
  assertNotIncludes("no anonymous inline shapes", out, "{ name: string }");
}

{
  const out = toTypeScript([{ a: 1, b: 2 }, { a: 1 }]).output;
  assertIncludes("intersect-required keys mark sometimes-missing field optional", out, "b?: number");
  assertIncludes("present-in-all keys stay required", out, "a: number;");
}

{
  const out = toTypeScript([{ foo: null }, { foo: "x" }]).output;
  assertIncludes("nullable detection: `T | null` for null + string siblings", out, "foo: string | null");
}

{
  const out = toTypeScript({ id: "550e8400-e29b-41d4-a716-446655440000" }).output;
  assertIncludes("UUID strings surface @format JSDoc", out, "@format uuid");
}

{
  const out = toTypeScript({ createdAt: "2024-01-01T00:00:00Z" }).output;
  assertIncludes("ISO date-time surfaces @format JSDoc", out, "@format date-time");
}

{
  const out = toTypeScript({ a: { x: 1 }, b: { x: 1 } }).output;
  // Both properties hold identical shapes — collect dedupes them under a
  // single named type, and the second property references the first.
  const matches = out.match(/export interface A\b/g) ?? [];
  check(
    "dedupes identical object shapes",
    matches.length === 1,
    `expected exactly one A interface, got ${matches.length}`,
  );
}

{
  const out = toTypeScript({}, { rootName: "Empty" }).output;
  assertIncludes("empty object becomes `Record<string, never>`", out, "Record<string, never>");
}

{
  const out = toTypeScript({ "foo-bar": 1, "123": 2 }).output;
  assertIncludes("non-identifier keys get quoted (foo-bar)", out, '"foo-bar"');
  assertIncludes("numeric keys get quoted (123)", out, '"123"');
}

{
  const out = toTypeScript({ a: 1 }, { declarationStyle: "type" }).output;
  assertIncludes("`type` style emits `export type Root = { ... }`", out, "export type Root = {");
}

{
  const out = toTypeScript({ a: 1 }, { readonly: true }).output;
  assertIncludes("`readonly` option marks fields readonly", out, "readonly a:");
}

{
  const out = toTypeScript({ user: { name: "x" } }, { childrenFirst: false }).output;
  // With childrenFirst:false, the root interface is declared above its dependencies.
  const rootIdx = out.indexOf("interface Root");
  const userIdx = out.indexOf("interface User");
  check(
    "childrenFirst:false puts Root above its children",
    rootIdx !== -1 && userIdx !== -1 && rootIdx < userIdx,
    `Root at ${rootIdx}, User at ${userIdx}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Zod
// ────────────────────────────────────────────────────────────────────────────
section("Zod");

{
  const out = toZod({ name: "x", age: 1 }).output;
  assertIncludes("imports zod", out, 'import { z } from "zod"');
  assertIncludes("emits z.object", out, "z.object({");
  assertIncludes("z.infer type alias", out, "z.infer<typeof");
}

{
  const out = toZod({ email: "a@b.co" }).output;
  assertIncludes("email format → .email()", out, ".email()");
}

{
  const out = toZod({ id: "550e8400-e29b-41d4-a716-446655440000" }).output;
  assertIncludes("uuid format → .uuid()", out, ".uuid()");
}

{
  const out = toZod({ ts: "2024-01-01T00:00:00Z" }).output;
  assertIncludes("date-time format → .datetime()", out, ".datetime");
}

{
  const out = toZod({ email: "a@b.co" }, { applyFormatRefinements: false }).output;
  assertNotIncludes("refinements off → plain z.string()", out, ".email()");
  assertIncludes("falls back to z.string()", out, "z.string()");
}

{
  const out = toZod({ a: 1 }, { strict: true }).output;
  assertIncludes("strict mode adds .strict()", out, ".strict()");
}

{
  const out = toZod([{ foo: null }, { foo: "x" }]).output;
  assertIncludes("nullable T → .nullable()", out, ".nullable()");
}

{
  const out = toZod({ a: 1 }, { rootName: "user" }).output;
  // Avoid the duplicate-export bug we fixed earlier.
  const userTypeCount = (out.match(/export type User\b/g) ?? []).length;
  check(
    "no duplicate `type User` export",
    userTypeCount === 1,
    `expected 1 type User, found ${userTypeCount}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Go
// ────────────────────────────────────────────────────────────────────────────
section("Go");

{
  const out = toGo({ name: "x" });
  assertIncludes("default package is `main`", out.output, "package main");
  assertIncludes("emits struct", out.output, "type Root struct {");
  assertIncludes("PascalCase field names", out.output, "Name string");
  assertIncludes("json tag preserves original key", out.output, '`json:"name"`');
}

{
  const out = toGo({ name: "x" }, { packageName: "models" }).output;
  assertIncludes("custom package name", out, "package models");
}

{
  const out = toGo({ user_name: "x" }, { jsonTagStyle: "camel" }).output;
  assertIncludes("camel tag style: user_name → userName", out, '`json:"userName"`');
}

{
  const out = toGo({ userName: "x" }, { jsonTagStyle: "snake" }).output;
  assertIncludes("snake tag style: userName → user_name", out, '`json:"user_name"`');
}

{
  const out = toGo([{ a: 1 }, {}], { omitemptyOnOptional: true }).output;
  assertIncludes("omitempty on optional", out, ",omitempty");
}

{
  const out = toGo([{ a: 1 }, {}], { omitemptyOnOptional: false }).output;
  assertNotIncludes("omitempty off", out, ",omitempty");
}

{
  const out = toGo([{ foo: null }, { foo: "x" }]).output;
  assertIncludes("nullable → *string pointer", out, "*string");
}

// ────────────────────────────────────────────────────────────────────────────
//  Python
// ────────────────────────────────────────────────────────────────────────────
section("Python");

{
  const out = toPython({ name: "x", age: 1 }).output;
  assertIncludes("default uses @dataclass", out, "@dataclass");
  assertIncludes("imports dataclass", out, "from dataclasses import dataclass");
  assertIncludes("future annotations for forward refs", out, "from __future__ import annotations");
}

{
  const out = toPython({ ts: "2024-01-01T00:00:00Z" }).output;
  assertIncludes("date-time format → datetime type", out, "datetime");
  assertIncludes("imports datetime", out, "from datetime import datetime");
}

{
  const out = toPython({ id: "550e8400-e29b-41d4-a716-446655440000" }).output;
  assertIncludes("uuid format → UUID type", out, "UUID");
  assertIncludes("imports UUID", out, "from uuid import UUID");
}

{
  const out = toPython({ a: 1 }, { classKind: "typeddict" }).output;
  assertIncludes("typeddict subclasses TypedDict", out, "TypedDict");
  assertNotIncludes("typeddict has no @dataclass", out, "@dataclass");
}

{
  const out = toPython({ a: 1 }, { classKind: "pydantic" }).output;
  assertIncludes("pydantic imports BaseModel", out, "from pydantic import BaseModel");
  assertIncludes("subclasses BaseModel", out, "(BaseModel)");
}

{
  const out = toPython({ a: 1 }, { classKind: "dataclass", useSlots: true }).output;
  assertIncludes("slots=True option", out, "slots=True");
}

{
  const out = toPython([{ a: 1, b: 2 }, { a: 1 }]).output;
  assertIncludes("optional fields default to None", out, "= None");
}

// ────────────────────────────────────────────────────────────────────────────
//  Rust
// ────────────────────────────────────────────────────────────────────────────
section("Rust");

{
  const out = toRust({ name: "x" }).output;
  assertIncludes("imports serde", out, "use serde::{Deserialize, Serialize}");
  assertIncludes("default derive list", out, "#[derive(Serialize, Deserialize, Debug, Clone)]");
  assertIncludes("pub struct", out, "pub struct Root");
}

{
  const out = toRust({ userName: "x" }).output;
  // userName isn't snake_case, so the field name becomes user_name with rename.
  assertIncludes("non-snake fields get serde rename", out, '#[serde(rename = "userName"');
  assertIncludes("field name snake_case'd", out, "user_name: String");
}

{
  const out = toRust({ name: "x" }, { extraDerives: ["Default", "PartialEq"] }).output;
  assertIncludes("extra derives appended", out, "Default, PartialEq");
}

{
  const out = toRust({ name: "x" }, { denyUnknownFields: true }).output;
  assertIncludes("deny_unknown_fields attribute", out, "#[serde(deny_unknown_fields)]");
}

{
  const out = toRust([{ foo: null }, { foo: "x" }]).output;
  assertIncludes("nullable → Option<T>", out, "Option<String>");
}

{
  const out = toRust({ type: 1 }).output;
  // `type` is a Rust keyword — must use raw identifier syntax.
  assertIncludes("Rust keyword fields use r# raw idents", out, "r#type");
}

// ────────────────────────────────────────────────────────────────────────────
//  CSV
// ────────────────────────────────────────────────────────────────────────────
section("CSV");

{
  const out = toCSV([{ a: 1, b: 2 }, { a: 3, b: 4 }]).output;
  assertIncludes("header row first", out, "a,b");
  assertIncludes("data rows follow", out, "1,2");
  assertIncludes("multi-line output", out, "\n");
}

{
  const out = toCSV([{ a: 1 }], { includeHeader: false }).output;
  assertNotIncludes("includeHeader off skips header", out, "a\n");
}

{
  const out = toCSV([{ a: 1, b: 2 }], { delimiter: ";" }).output;
  assertIncludes("custom delimiter (;)", out, "a;b");
}

{
  const out = toCSV([{ user: { name: "x" } }]).output;
  assertIncludes("nested object flattens to dot notation", out, "user.name");
}

{
  const out = toCSV([{ a: 'has "quote"' }]).output;
  assertIncludes("quoted values escape quotes", out, '"has ""quote"""');
}

{
  const out = toCSV([{ a: 1 }], { bom: true }).output;
  check(
    "BOM prefix on output",
    out.charCodeAt(0) === 0xfeff,
    `first char code was ${out.charCodeAt(0)}, expected 0xFEFF`,
  );
}

{
  const out = toCSV([{ a: 1 }], { newline: "\r\n" }).output;
  assertIncludes("CRLF line endings", out, "\r\n");
}

// ────────────────────────────────────────────────────────────────────────────
//  YAML
// ────────────────────────────────────────────────────────────────────────────
section("YAML");

{
  const out = toYAML({ name: "x", age: 1 }).output;
  assertIncludes("emits name field", out, "name:");
  assertIncludes("emits age field", out, "age:");
}

{
  const out = toYAML({ b: 1, a: 2 }, { sortKeys: true }).output;
  const aIdx = out.indexOf("a:");
  const bIdx = out.indexOf("b:");
  check(
    "sorted keys: a before b",
    aIdx < bIdx,
    `a at ${aIdx}, b at ${bIdx}`,
  );
}

{
  const out = toYAML({ list: [1, 2, 3] }).output;
  assertIncludes("array items as block sequence", out, "- 1");
}

// ────────────────────────────────────────────────────────────────────────────
//  XML
// ────────────────────────────────────────────────────────────────────────────
section("XML");

{
  const out = toXML({ name: "x" }).output;
  assertIncludes("XML declaration", out, '<?xml version="1.0"');
  assertIncludes("default root tag", out, "<root>");
  assertIncludes("element with value", out, "<name>x</name>");
}

{
  const out = toXML({ a: 1 }, { declaration: false }).output;
  assertNotIncludes("declaration:false strips header", out, "<?xml");
}

{
  const out = toXML({ tags: ["a", "b"] }, { itemTag: "tag" }).output;
  assertIncludes("custom item tag", out, "<tag>a</tag>");
  assertIncludes("multiple items as siblings", out, "<tag>b</tag>");
}

{
  const out = toXML({ a: null }).output;
  assertIncludes("null → nil=true attribute", out, 'nil="true"');
}

{
  const out = toXML({ "1st": "x" }).output;
  assertIncludes("digit-start keys get _ prefix", out, "<_1st>");
}

// ────────────────────────────────────────────────────────────────────────────
//  JSON Schema
// ────────────────────────────────────────────────────────────────────────────
section("JSON Schema");

{
  const out = toJsonSchema({ name: "x" }).output;
  assertIncludes("draft 2020-12 by default", out, "2020-12");
  assertIncludes("emits object type", out, '"type": "object"');
  assertIncludes("captures required fields", out, '"required"');
}

{
  const out = toJsonSchema({ name: "x" }, { draft: "draft-07" }).output;
  assertIncludes("draft-07 schema URI", out, "draft-07/schema");
}

{
  const out = toJsonSchema([{ a: 1, b: 2 }, { a: 3 }]).output;
  // b only present in the first item — required is intersection only.
  // Inspect the `required` array specifically; `"b"` will still appear as a
  // properties key, which is fine.
  const requiredMatch = out.match(/"required":\s*\[\s*([^\]]*)\]/);
  const requiredKeys = requiredMatch ? requiredMatch[1] : "";
  check(
    "required contains 'a'",
    requiredKeys.includes('"a"'),
    `required: ${requiredKeys}`,
  );
  check(
    "required does NOT contain 'b' (missing from one sibling)",
    !requiredKeys.includes('"b"'),
    `required: ${requiredKeys}`,
  );
}

{
  const out = toJsonSchema({ count: 5 }).output;
  assertIncludes("whole numbers infer as integer", out, '"type": "integer"');
}

{
  const out = toJsonSchema({ price: 5.5 }).output;
  assertIncludes("fractional numbers infer as number", out, '"type": "number"');
}

{
  const out = toJsonSchema({ email: "a@b.co" }).output;
  assertIncludes("email format detected", out, '"format": "email"');
}

// ────────────────────────────────────────────────────────────────────────────
//  Summary
// ────────────────────────────────────────────────────────────────────────────

console.log(`\n${pass + fail} tests, ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
