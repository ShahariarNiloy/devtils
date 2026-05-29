#!/usr/bin/env node
/**
 * One-shot codemod: lifts the inline JSX props in every tool's content.tsx
 * into a named `seoData` const and re-exports it. After this runs once, the
 * content stays in its own file (no central registry), but every tool's
 * SEO data is importable by the FAQ JSON-LD and FAQ-search machinery.
 *
 *   Before:                     After:
 *   export function FooContent() {        export const seoData = {
 *     return (                              intro: "...",
 *       <ToolContent                        useCases: [...],
 *         intro="..."                       faqs: [...],
 *         useCases={[...]}                  relatedSlugs: [...],
 *         faqs={[...]}                    } as const;
 *         relatedSlugs={[...]}            export function FooContent() {
 *       />                                  return <ToolContent {...seoData} />;
 *     );                                  }
 *   }
 *
 * Idempotent: a second run is a no-op (skips files that already export
 * seoData).
 */
import fs from "node:fs";
import path from "node:path";

const TOOLS_DIR = path.resolve(process.cwd(), "src/components/tools");

function findContentFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const candidate = path.join(dir, entry.name, "content.tsx");
      if (fs.existsSync(candidate)) out.push(candidate);
    }
  }
  return out;
}

function refactor(file) {
  const src = fs.readFileSync(file, "utf8");
  if (src.includes("export const seoData")) return { file, skipped: true };

  // Match the entire JSX prop block inside ToolContent.
  // Lazy-match to the SELF-CLOSING `/>` of the ToolContent tag.
  const jsxRe = /<ToolContent\s+([\s\S]*?)\s*\/>/;
  const m = src.match(jsxRe);
  if (!m) return { file, error: "no <ToolContent /> match" };

  const propsBlock = m[1];

  // Each top-level JSX prop: `name="..."` (string literal) OR `name={expr}` (curly-braced expression).
  // We walk the props block by depth-tracking the curly braces so the inner
  // arrays/objects don't confuse us.
  const props = {};
  let i = 0;
  while (i < propsBlock.length) {
    // Skip whitespace.
    while (i < propsBlock.length && /\s/.test(propsBlock[i])) i++;
    if (i >= propsBlock.length) break;

    // Read identifier.
    const idStart = i;
    while (i < propsBlock.length && /[A-Za-z0-9_]/.test(propsBlock[i])) i++;
    const name = propsBlock.slice(idStart, i);
    if (!name) break;

    // Expect '='.
    if (propsBlock[i] !== "=") break;
    i++;

    // Either "...string..." or {expr}
    if (propsBlock[i] === '"') {
      const start = i;
      i++;
      while (i < propsBlock.length && propsBlock[i] !== '"') {
        if (propsBlock[i] === "\\") i += 2;
        else i++;
      }
      i++; // consume closing "
      props[name] = propsBlock.slice(start, i);
    } else if (propsBlock[i] === "{") {
      const start = ++i;
      let depth = 1;
      while (i < propsBlock.length && depth > 0) {
        const ch = propsBlock[i];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        if (depth > 0) i++;
      }
      props[name] = propsBlock.slice(start, i);
      i++; // consume closing }
    } else {
      return { file, error: `unexpected char after ${name}=` };
    }
  }

  // Compose the new file body.
  const ordered = ["intro", "useCases", "faqs", "relatedSlugs"];
  const lines = ["export const seoData = {"];
  for (const k of ordered) {
    if (props[k] === undefined) continue;
    lines.push(`  ${k}: ${props[k]},`);
  }
  lines.push("} as const;");
  const seoDecl = lines.join("\n");

  // Replace the function body to use {...seoData}.
  const replaced = src.replace(
    /return\s*\(\s*<ToolContent[\s\S]*?\/>\s*\);/,
    "return <ToolContent {...seoData} />;",
  );

  // Find the `export function …Content() {` line and inject the const above it.
  const updated = replaced.replace(
    /(export function [A-Za-z0-9_]+Content\(\) \{)/,
    `${seoDecl}\n\n$1`,
  );

  fs.writeFileSync(file, updated, "utf8");
  return { file, ok: true };
}

const files = findContentFiles(TOOLS_DIR);
let ok = 0, skipped = 0, errors = 0;
for (const f of files) {
  const r = refactor(f);
  if (r.skipped) { skipped++; console.log(`skip ${path.relative(process.cwd(), f)}`); }
  else if (r.error) { errors++; console.error(`ERR ${path.relative(process.cwd(), f)}: ${r.error}`); }
  else { ok++; console.log(`ok   ${path.relative(process.cwd(), f)}`); }
}
console.log(`\n${ok} refactored, ${skipped} skipped, ${errors} errors`);
process.exit(errors > 0 ? 1 : 0);
