/**
 * Tests for css-unit-converter.lib — covers the conversion math, scale
 * snapping, base-size detection, bulk rewrite (with shorthand, comments,
 * strings, url(...) edge cases), and clamp() generation.
 *
 * Run: npx tsx src/components/tools/css-unit-converter/__tests__/lib.test.ts
 */

/* eslint-disable no-console */

import {
  bulkRewrite,
  buildClamp,
  convert,
  DEFAULT_CONTEXT,
  detectBaseFontSize,
  evaluateClampAt,
  format,
  fromPx,
  gridAlignment,
  isClean,
  snapToScale,
  SPACING_PROPERTIES,
  TAILWIND_SPACING,
  TYPOGRAPHY_PROPERTIES,
  toPx,
} from "../css-unit-converter.lib";

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

function eq(label: string, a: unknown, b: unknown) {
  check(label, a === b, `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function close(label: string, a: number, b: number, eps = 1e-9) {
  check(label, Math.abs(a - b) < eps, `expected ~${b}, got ${a}`);
}

function includes(label: string, haystack: string, needle: string) {
  check(label, haystack.includes(needle), `expected substring \`${needle}\` in:\n${haystack}`);
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ────────────────────────────────────────────────────────────────────────────
section("Core conversion math");

const ctx = DEFAULT_CONTEXT;

close("16px → 1rem at base 16", fromPx(16, "rem", ctx), 1);
close("32px → 2rem at base 16", fromPx(32, "rem", ctx), 2);
close("1rem → 16px at base 16", toPx(1, "rem", ctx), 16);
close("0.5rem → 8px at base 16", toPx(0.5, "rem", ctx), 8);
close("12pt → 16px (96/72 ratio)", toPx(12, "pt", ctx), 16);
close("1pc → 16px (one pica)", toPx(1, "pc", ctx), 16);
close("1in → 96px (CSS inch)", toPx(1, "in", ctx), 96);
close("2.54cm → 96px (one inch)", toPx(2.54, "cm", ctx), 96);
close("25.4mm → 96px (one inch)", toPx(25.4, "mm", ctx), 96);
close("96px → 1in (round-trip)", fromPx(96, "in", ctx), 1);
close("96px → 2.54cm (round-trip)", fromPx(96, "cm", ctx), 2.54);
close("16px → 1pc (round-trip)", fromPx(16, "pc", ctx), 1);
close("100% → 16px (typography %)", toPx(100, "%", ctx), 16);
close("10vw at 1440 → 144px", toPx(10, "vw", ctx), 144);
close("50vh at 900 → 450px", toPx(50, "vh", ctx), 450);
close("px → px is identity", convert(17, "px", "px", ctx), 17);
close("rem → em is identity (same base)", convert(1.5, "rem", "em", ctx), 1.5);

// Base 10 (common designer choice for easier math)
const ctx10 = { ...ctx, baseFontSize: 10 };
close("16px → 1.6rem at base 10", fromPx(16, "rem", ctx10), 1.6);
close("1rem → 10px at base 10", toPx(1, "rem", ctx10), 10);

// ────────────────────────────────────────────────────────────────────────────
section("Formatting + cleanliness");

eq("trims trailing zeros: 1.5000 → 1.5", format(1.5, 4), "1.5");
eq("integer stays integer", format(2, 4), "2");
eq("Infinity → em-dash", format(Infinity, 4), "—");
check("1rem is clean", isClean(1, 4));
check("1.0625rem is not clean at precision 4", isClean(1.0625, 4));
check("0.333... is not clean at precision 4", !isClean(1 / 3, 4));

// ────────────────────────────────────────────────────────────────────────────
section("Grid alignment");

eq("16px aligns to 16", gridAlignment(16), 16);
eq("8px aligns to 8 (not 16)", gridAlignment(8), 8);
eq("12px aligns to 4 (not 8)", gridAlignment(12), 4);
eq("7px doesn't align to any common grid", gridAlignment(7), 0);
eq("32px aligns to 16", gridAlignment(32), 16);

// ────────────────────────────────────────────────────────────────────────────
section("Scale snap");

const snap16 = snapToScale(16, TAILWIND_SPACING);
check("snap 16px → tailwind space-4 (exact)", !!snap16 && snap16.exact && snap16.token.name === "4");
// 17 is closer to 16 (dist 1) than to 20 (dist 3) — unambiguous match on space-4.
const snap17 = snapToScale(17, TAILWIND_SPACING);
check("snap 17px → tailwind space-4 (not exact)", !!snap17 && !snap17.exact && snap17.token.name === "4");
const snap10 = snapToScale(10, TAILWIND_SPACING);
check("snap 10px → tailwind 2.5 (exact)", !!snap10 && snap10.exact && snap10.token.name === "2.5");

// ────────────────────────────────────────────────────────────────────────────
section("Base font-size detection");

{
  const { base, source } = detectBaseFontSize(`html { font-size: 16px; }`);
  eq("authoritative html font-size: 16px → base 16", base, 16);
  eq("source = root-px", source, "root-px");
}

{
  const { base } = detectBaseFontSize(`:root { font-size: 10px; } .a { padding: 16px; }`);
  eq("authoritative :root override → base 10", base, 10);
}

{
  // 10px shortcut: 62.5% of 16 = 10
  const { base, source } = detectBaseFontSize(`html { font-size: 62.5%; }`);
  eq("62.5% shortcut → base 10", base, 10);
  eq("source = root-percent", source, "root-percent");
}

{
  // No authoritative declaration — null is honest, UI defaults to 16.
  const { base, source } = detectBaseFontSize(`.a { padding: 16px; margin: 1rem; }`);
  eq("no :root / html font-size → null base", base, null);
  eq("source = none", source, "none");
}

// ────────────────────────────────────────────────────────────────────────────
section("Bulk rewrite — all-scope");

{
  const out = bulkRewrite(`.box { padding: 16px; margin: 8px 16px; }`, {
    from: "px",
    to: "rem",
    scope: { kind: "all" },
    ctx,
    preserveHairlines: false,
  });
  includes("px → rem replaces all px values", out.output, "padding: 1rem");
  includes("shorthand: each value converted", out.output, "margin: 0.5rem 1rem");
  eq("count: 3 px replacements", out.replaced, 3);
}

{
  // Preserve hairlines means a `1px` border stays as 1px.
  const out = bulkRewrite(`.a { border: 1px solid #000; padding: 16px; }`, {
    from: "px",
    to: "rem",
    scope: { kind: "all" },
    ctx,
    preserveHairlines: true,
  });
  includes("hairline preserved: 1px stays", out.output, "1px solid");
  includes("non-hairline converted: 16px → 1rem", out.output, "padding: 1rem");
}

// ────────────────────────────────────────────────────────────────────────────
section("Bulk rewrite — scope filters");

{
  // include scope: only convert spacing properties
  const out = bulkRewrite(
    `.a { padding: 16px; font-size: 16px; border-width: 16px; }`,
    {
      from: "px",
      to: "rem",
      scope: { kind: "include", properties: SPACING_PROPERTIES },
      ctx,
      preserveHairlines: false,
    },
  );
  includes("padding (in-scope) converted", out.output, "padding: 1rem");
  includes("font-size (out-of-scope) untouched", out.output, "font-size: 16px");
  includes("border-width (out-of-scope) untouched", out.output, "border-width: 16px");
}

{
  const out = bulkRewrite(
    `.a { font-size: 16px; padding: 16px; }`,
    {
      from: "px",
      to: "rem",
      scope: { kind: "include", properties: TYPOGRAPHY_PROPERTIES },
      ctx,
      preserveHairlines: false,
    },
  );
  includes("typography scope converts font-size", out.output, "font-size: 1rem");
  includes("typography scope leaves padding", out.output, "padding: 16px");
}

// ────────────────────────────────────────────────────────────────────────────
section("Bulk rewrite — edge cases");

{
  // Comments must pass through verbatim, including numeric-unit-like content.
  const out = bulkRewrite(
    `.a { /* was 16px before */ padding: 16px; }`,
    {
      from: "px",
      to: "rem",
      scope: { kind: "all" },
      ctx,
      preserveHairlines: false,
    },
  );
  includes("comment kept verbatim", out.output, "/* was 16px before */");
  includes("actual declaration converted", out.output, "padding: 1rem");
}

{
  // Strings inside content: '' — must pass through
  const out = bulkRewrite(
    `.a::before { content: "16px"; padding: 16px; }`,
    {
      from: "px",
      to: "rem",
      scope: { kind: "all" },
      ctx,
      preserveHairlines: false,
    },
  );
  includes("string literal preserved", out.output, `content: "16px"`);
  includes("padding converted", out.output, "padding: 1rem");
}

{
  // calc() — the numeric-unit regex still matches inside calc, which is what
  // we want (designers want their calc values converted too).
  const out = bulkRewrite(
    `.a { width: calc(100% - 16px); }`,
    {
      from: "px",
      to: "rem",
      scope: { kind: "all" },
      ctx,
      preserveHairlines: false,
    },
  );
  includes("calc px → rem", out.output, "calc(100% - 1rem)");
}

{
  // Pseudo selectors must not be confused with declarations
  const out = bulkRewrite(
    `.a:hover { padding: 16px; } .b::after { padding: 16px; }`,
    {
      from: "px",
      to: "rem",
      scope: { kind: "all" },
      ctx,
      preserveHairlines: false,
    },
  );
  includes("pseudo-class :hover untouched", out.output, ":hover");
  includes("pseudo-element ::after untouched", out.output, "::after");
  eq("both rules converted", out.replaced, 2);
}

{
  // Physical units recognised — convert cm to px
  const out = bulkRewrite(`.a { width: 2.54cm; }`, {
    from: "cm",
    to: "px",
    scope: { kind: "all" },
    ctx,
    preserveHairlines: false,
  });
  includes("2.54cm → 96px", out.output, "width: 96px");
}

{
  // Media queries — declarations inside @media still get converted
  const out = bulkRewrite(
    `@media (min-width: 768px) { .a { padding: 16px; } }`,
    {
      from: "px",
      to: "rem",
      scope: { kind: "all" },
      ctx,
      preserveHairlines: false,
    },
  );
  includes("@media query bounds preserved", out.output, "(min-width: 768px)");
  includes("nested declaration converted", out.output, "padding: 1rem");
}

// ────────────────────────────────────────────────────────────────────────────
section("clamp() builder");

{
  // Classic fluid-type spec: 16px @ 320px viewport → 24px @ 1440px viewport
  const result = buildClamp({
    minPx: 16,
    maxPx: 24,
    minViewportPx: 320,
    maxViewportPx: 1440,
    baseFontSize: 16,
    outputUnit: "rem",
    precision: 4,
  });
  includes("clamp expression contains 1rem (min)", result.expression, "1rem");
  includes("clamp expression contains 1.5rem (max)", result.expression, "1.5rem");
  includes("clamp expression starts with clamp(", result.expression, "clamp(");
  close("slope is positive (font grows with viewport)", result.slopeVw > 0 ? 1 : 0, 1);

  // At min/max viewports we should hit exactly the min/max values
  close("eval at min viewport = minPx", evaluateClampAt({
    minPx: 16, maxPx: 24, minViewportPx: 320, maxViewportPx: 1440,
    baseFontSize: 16, outputUnit: "rem", precision: 4,
  }, 320), 16);
  close("eval at max viewport = maxPx", evaluateClampAt({
    minPx: 16, maxPx: 24, minViewportPx: 320, maxViewportPx: 1440,
    baseFontSize: 16, outputUnit: "rem", precision: 4,
  }, 1440), 24);
  close("eval at midpoint = average", evaluateClampAt({
    minPx: 16, maxPx: 24, minViewportPx: 320, maxViewportPx: 1440,
    baseFontSize: 16, outputUnit: "rem", precision: 4,
  }, 880), 20);
}

// ────────────────────────────────────────────────────────────────────────────
console.log(`\n${pass + fail} tests, ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
