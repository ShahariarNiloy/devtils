/**
 * Integrity tests for the cross-file invariants that aren't compile-time
 * checkable. Catches the drift cases the audit specifically flagged:
 *
 *  - `IMPLEMENTED_TOOL_SLUGS` keys all exist in the tools registry.
 *  - Every live tool has a `seoData` export wired in `tool-seo.ts`.
 *  - Every tool's `relatedSlugs` point at a real registry slug.
 *  - `LIVE_TOOL_COUNT` lines up with `COMPONENT_MAP.size`.
 *
 * Run: npx tsx src/__tests__/integrity.test.ts
 */

/* eslint-disable no-console */

import { TOOLS, getToolBySlug } from "../lib/tools-registry";
import {
  COMPONENT_MAP,
  IMPLEMENTED_TOOL_SLUGS,
  LIVE_TOOL_COUNT,
} from "../lib/implemented-tools";
import { getToolSeoData, getToolSearchableText } from "../lib/tool-seo";
import { safeJsonLd } from "../lib/safe-json-ld";

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

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ────────────────────────────────────────────────────────────────────────────

section("Registry ↔ component map");

{
  const registrySlugs = new Set(TOOLS.map((t) => t.slug));
  for (const slug of IMPLEMENTED_TOOL_SLUGS) {
    check(
      `COMPONENT_MAP slug \`${slug}\` exists in registry`,
      registrySlugs.has(slug),
      `add the tool to src/lib/tools-registry.ts or remove from COMPONENT_MAP`,
    );
  }
}

{
  check(
    "LIVE_TOOL_COUNT matches IMPLEMENTED_TOOL_SLUGS.size",
    LIVE_TOOL_COUNT === IMPLEMENTED_TOOL_SLUGS.size,
    `live count ${LIVE_TOOL_COUNT}, set size ${IMPLEMENTED_TOOL_SLUGS.size}`,
  );
  check(
    "IMPLEMENTED_TOOL_SLUGS matches Object.keys(COMPONENT_MAP)",
    IMPLEMENTED_TOOL_SLUGS.size === Object.keys(COMPONENT_MAP).length,
    `slug-set size ${IMPLEMENTED_TOOL_SLUGS.size}, map keys ${Object.keys(COMPONENT_MAP).length}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────

section("SEO data coverage");

for (const slug of IMPLEMENTED_TOOL_SLUGS) {
  const seo = getToolSeoData(slug);
  check(
    `\`${slug}\` has seoData wired in tool-seo.ts`,
    seo !== undefined,
    `add the slug to TOOL_SEO in src/lib/tool-seo.ts`,
  );
  if (seo) {
    check(
      `  ${slug}: intro is non-empty`,
      seo.intro.trim().length > 50,
      `intro is "${seo.intro.slice(0, 40)}…"`,
    );
    check(
      `  ${slug}: at least 3 use cases`,
      seo.useCases.length >= 3,
      `got ${seo.useCases.length}`,
    );
    check(
      `  ${slug}: at least 5 FAQs`,
      seo.faqs.length >= 5,
      `got ${seo.faqs.length}`,
    );
    check(
      `  ${slug}: searchable text aggregates FAQ content`,
      getToolSearchableText(slug).length > 200,
      `aggregation is suspiciously short`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────

section("Related-tool links");

for (const slug of IMPLEMENTED_TOOL_SLUGS) {
  const seo = getToolSeoData(slug);
  if (!seo?.relatedSlugs) continue;
  for (const related of seo.relatedSlugs) {
    check(
      `\`${slug}\` → related \`${related}\` exists in registry`,
      getToolBySlug(related) !== undefined,
      `unknown slug — typo, or the related tool isn't registered`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────

section("Tool registry shape");

for (const tool of TOOLS) {
  check(
    `\`${tool.slug}\`: slug is kebab-case`,
    /^[a-z][a-z0-9-]*$/.test(tool.slug),
    `slug "${tool.slug}" doesn't match /^[a-z][a-z0-9-]*$/`,
  );
  check(
    `\`${tool.slug}\`: has at least one tag`,
    tool.tags.length > 0,
    `tags array is empty`,
  );
  check(
    `\`${tool.slug}\`: description under 100 chars (best for OG/meta)`,
    tool.description.length < 100,
    `description is ${tool.description.length} chars: "${tool.description.slice(0, 60)}…"`,
  );
}

// ────────────────────────────────────────────────────────────────────────────

section("safeJsonLd escapes script-element injection");

{
  const payload = {
    name: "evil",
    description: "Try `</script><img src=x onerror=alert(1)>`",
    tag: "<>&",
  };
  const out = safeJsonLd(payload);
  check("output does not contain raw `<`", !out.includes("<"), `got: ${out}`);
  check("output does not contain raw `>`", !out.includes(">"), `got: ${out}`);
  check(
    "output does not contain raw `&` (the escape is &amp; or \\u0026)",
    !/[&](?!#?\w+;)/.test(out) ? true : !out.includes("&"),
    `got: ${out}`,
  );
  check(
    "still round-trips through JSON.parse",
    JSON.parse(out).description === payload.description,
    `parse mismatch`,
  );
}

// ────────────────────────────────────────────────────────────────────────────

console.log(`\n${pass + fail} checks, ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
