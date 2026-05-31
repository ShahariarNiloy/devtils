import { ToolContent } from "@/components/shared/tool-content";

interface SeoData {
  intro: string;
  useCases: readonly { title: string; description: string }[];
  faqs: readonly { question: string; answer: string }[];
  relatedSlugs: readonly string[];
}

const DEFAULT_SEO: SeoData = {
  intro:
    "Convert between px, rem, em, %, pt, pc, in, cm, mm, vw, and vh with a configurable root font-size. Bulk-convert a whole CSS block, scope conversions to spacing or typography only, and build fluid `clamp()` expressions for responsive type. Runs entirely in your browser — pasted CSS never leaves the tab.",
  useCases: [
    {
      title: "Migrating a px-only stylesheet to rem",
      description:
        "Paste your existing CSS into the Bulk panel, pick `px → rem`, leave Hairlines preserved so 1px borders stay sharp, and copy the result. The diff view confirms only spacing and sizing values changed.",
    },
    {
      title: "Building a fluid type ramp without re-doing the math",
      description:
        "Open the Clamp() builder, enter min size + min viewport and max size + max viewport, and the tool emits `clamp(1rem, …, 1.5rem)` with the algebra shown. Drag the preview slider to see the size at any viewport width.",
    },
    {
      title: "Quick px ↔ rem during code review",
      description:
        "Type a value, see px / rem / em / pt / pc / % / in / cm / mm / vw / vh all at once. The reference table makes 16px ↔ 1rem and similar conversions a one-click affair. Tailwind scale badges flag when a value lines up with `space-N`.",
    },
    {
      title: "Auditing a project's root font-size",
      description:
        "Paste any CSS into the Bulk panel. If a `:root { font-size: … }` declaration exists, the tool surfaces it and offers to switch the base font-size everywhere — so conversions match how the page actually renders.",
    },
  ],
  faqs: [
    {
      question: "What units are supported?",
      answer:
        "px, rem, em, %, pt, pc, in, cm, mm, vw, and vh. Conversions pivot through pixels, so converting any unit to any other only takes one step. rem and em share the same root font-size in this tool — that's the way they're used in 99% of real CSS; the parent-font-size cascade for em is something you can't infer from a calculator anyway.",
    },
    {
      question: "How does the tool decide what counts as 1 rem?",
      answer:
        "Root font-size, which you control with the Base chip in the header (presets 10 / 12 / 14 / 16 / 18 / 20 + custom). 16px is the browser default. The 10px shortcut (`html { font-size: 62.5% }`) yields a base of 10, useful for easy math but make sure your real CSS matches the value you set here.",
    },
    {
      question: "Is `dpi` a length unit?",
      answer:
        "No — `dpi` is a *resolution* unit used in media queries (`@media (resolution: 96dpi)`). For length conversions involving physical units, CSS defines `pt`, `pc`, `in`, `cm`, and `mm` (all included here). They convert via the fixed identity `1in = 96 CSS px`, regardless of the device's actual pixel density.",
    },
    {
      question: "What does the 'Bulk' panel actually change?",
      answer:
        "It rewrites numeric+unit pairs inside CSS declarations: `padding: 16px` → `padding: 1rem`. The walker tracks comments, string literals, and `url(...)` payloads so they're never touched. You can scope the conversion to spacing/sizing only, typography only, or all properties — and the 'Keep 1px hairlines' checkbox preserves single-pixel borders for crisp dividers.",
    },
    {
      question: "How does the clamp() builder work?",
      answer:
        "You give it four numbers: a min font-size, the viewport width at which the minimum should still apply, and the same pair for the maximum. It fits a straight line between those two points and emits `clamp(min, intercept + slope*vw, max)`. Below the min viewport you get the min size; above the max viewport, the max. Drag the preview slider to see what size the formula produces at any viewport width in between.",
    },
    {
      question: "Why does a converted value show ≈ next to it?",
      answer:
        "Because the value doesn't round cleanly at your current precision setting. `17px / 16` is `1.0625rem` exactly — that's fine — but `15px / 16` is `0.9375rem`, which most designers don't want as a literal in their CSS. The badge lets you spot 'off-grid' values at a glance so you can nudge them to the nearest clean increment.",
    },
    {
      question: "Does my CSS leave the browser?",
      answer:
        "No. All the math runs locally — there's no network call. Safe for proprietary stylesheets, design-system internals, or anything you wouldn't paste into a public formatter.",
    },
    {
      question: "Are there keyboard shortcuts?",
      answer:
        "`⌘K` focuses the value input on the Convert tab. On any number field, ↑/↓ steps by 1, `⇧+↑/↓` steps by 10. Selecting a unit from the dropdown updates everything live — there's no Convert button to click.",
    },
  ],
  relatedSlugs: [
    "css-minifier",
    "css-to-tailwind",
    "color-converter",
    "diff-checker",
  ],
};

const UNIT_FULL_NAMES: Record<string, string> = {
  px: "pixels",
  rem: "rem (root em)",
  em: "em",
  pt: "points",
  pc: "picas",
  in: "inches",
  cm: "centimeters",
  mm: "millimeters",
  vw: "viewport width",
  vh: "viewport height",
  "%": "percent",
};

/** All alias slug families we generate dedicated SEO copy for. */
const ALIAS_PAIRS: readonly { from: string; to: string }[] = [
  { from: "px", to: "rem" },
  { from: "rem", to: "px" },
  { from: "px", to: "em" },
  { from: "em", to: "px" },
  { from: "px", to: "pt" },
  { from: "pt", to: "px" },
];

/**
 * Build per-alias SEO copy. Each alias page gets a distinct intro and a
 * targeted "How to convert X to Y" FAQ entry up top — distinct enough that
 * Google won't collapse them as duplicate content, while still sharing the
 * full FAQ underneath. relatedSlugs cross-link sibling aliases + the
 * canonical tool, so each page surfaces the alternatives.
 */
function buildAliasSeo(from: string, to: string): SeoData {
  const fromFull = UNIT_FULL_NAMES[from] ?? from;
  const toFull = UNIT_FULL_NAMES[to] ?? to;
  const intro = pairIntro(from, to, fromFull, toFull);
  const targetedFaq = pairFaq(from, to);

  // Cross-link: other alias pairs except this one, plus canonical at the end.
  const siblings = ALIAS_PAIRS
    .filter((p) => !(p.from === from && p.to === to))
    .map((p) => `${p.from}-to-${p.to}-converter`);
  const relatedSlugs = [...siblings.slice(0, 3), "css-unit-converter"];

  return {
    intro,
    useCases: DEFAULT_SEO.useCases,
    faqs: [targetedFaq, ...DEFAULT_SEO.faqs],
    relatedSlugs,
  };
}

function pairIntro(from: string, to: string, fromFull: string, toFull: string): string {
  // Hand-tuned per pair so the intro reads naturally and includes the exact
  // search phrasing ("px to rem converter" etc.) for ranking signal. Each
  // intro covers: what the conversion is, the math, when you'd reach for it,
  // and a privacy note (matches the canonical tool's stance).
  const key = `${from}-${to}`;
  switch (key) {
    case "px-rem":
      return "Convert pixels to rem instantly. Type any px value and the rem equivalent updates live, using a configurable root font-size (default 16px). The 10px shortcut (`html { font-size: 62.5% }`) is supported via the Base picker. Bulk-convert an entire CSS file or build fluid `clamp()` expressions in the other tabs. Runs in your browser — nothing uploaded.";
    case "rem-px":
      return "Convert rem to pixels instantly. Type any rem value and see the px equivalent at your chosen root font-size (default 16px). Useful when reverse-engineering a stylesheet, calculating exact pixel dimensions for design specs, or converting design-system tokens back to absolute values. All conversions run locally in your browser.";
    case "px-em":
      return "Convert pixels to em with a configurable parent font-size. While `em` cascades from the parent element in real CSS, for calculator purposes this tool uses the root font-size you set (matching how 99% of em values are used in practice). Type any px and the em equivalent appears immediately.";
    case "em-px":
      return "Convert em to pixels instantly. Useful for sanity-checking inherited typography scales, translating em-based design tokens to absolute values, or auditing a third-party stylesheet. Set the root font-size with the Base chip; everything updates live.";
    case "px-pt":
      return "Convert pixels to points (the typography unit used in print and the OS clipboard). The CSS specification fixes 1pt = 96/72 px exactly, so this conversion is precise regardless of your display's DPI. Useful when matching CSS sizes to Figma / Sketch / print specs that quote in points.";
    case "pt-px":
      return "Convert points to pixels. Designers often receive specs in `pt` (the typography unit native to print and most design tools). Type a pt value to get the exact CSS px equivalent — 12pt = 16px, 9pt = 12px, and so on. Everything runs locally.";
    default:
      return `Convert ${fromFull} to ${toFull} instantly with a configurable root font-size and viewport. Everything runs in your browser.`;
  }
}

function pairFaq(from: string, to: string): { question: string; answer: string } {
  const key = `${from}-${to}`;
  switch (key) {
    case "px-rem":
      return {
        question: "How do I convert px to rem?",
        answer:
          "Divide the pixel value by the root font-size. With the default 16px base: `16px ÷ 16 = 1rem`, `24px ÷ 16 = 1.5rem`, `32px ÷ 16 = 2rem`. Set a different base (e.g. 10 for the 62.5% shortcut, or any custom number) in the Base picker in the header — the math line below the result always shows the exact division it's doing.",
      };
    case "rem-px":
      return {
        question: "How do I convert rem to px?",
        answer:
          "Multiply the rem value by the root font-size. With the default 16px base: `1rem × 16 = 16px`, `1.5rem × 16 = 24px`, `0.5rem × 16 = 8px`. Use the Base picker to change the root font-size if your project uses a different value (commonly 10 for the 62.5% shortcut).",
      };
    case "px-em":
      return {
        question: "How do I convert px to em?",
        answer:
          "Divide the pixel value by the font-size of the parent element. This calculator uses the root font-size as the parent (matching the common case where `em` inherits from `:root` or `html`). For nested elements with their own font-size, manually substitute the relevant size in the Base picker.",
      };
    case "em-px":
      return {
        question: "How do I convert em to px?",
        answer:
          "Multiply the em value by the parent element's font-size. This calculator treats the root font-size as the parent. For nested elements where `em` cascades from a parent with a different font-size, substitute that size in the Base picker to get the correct px result.",
      };
    case "px-pt":
      return {
        question: "How do I convert px to pt?",
        answer:
          "Multiply by 72/96. CSS defines 1pt = 1/72 of a CSS inch, and 1in = 96 CSS pixels — so `1px × (72/96) = 0.75pt` and `16px = 12pt`. This conversion is exact and doesn't depend on display DPI; it's the CSS specification, not the physical pixel density of any particular screen.",
      };
    case "pt-px":
      return {
        question: "How do I convert pt to px?",
        answer:
          "Multiply by 96/72 (= 1.333…). CSS defines 1pt = 1/72 of a CSS inch and 1in = 96 CSS pixels, so `1pt = 1.333… px` and `12pt = 16px`. The conversion is exact and is fixed by the CSS specification — it doesn't change based on your screen's DPI.",
      };
    default:
      return {
        question: `How do I convert ${from} to ${to}?`,
        answer: `Type a value in ${from} and read the equivalent ${to} from the result card. The honest math line shows the exact factor used.`,
      };
  }
}

function getSeoData(slug: string): SeoData {
  const m = /^([a-z]+)-to-([a-z]+)-converter$/.exec(slug);
  if (!m) return DEFAULT_SEO;
  const [, from, to] = m;
  if (ALIAS_PAIRS.some((p) => p.from === from && p.to === to)) {
    return buildAliasSeo(from, to);
  }
  return DEFAULT_SEO;
}

export const seoData = DEFAULT_SEO;

export function CssUnitConverterContent({ slug }: { slug?: string }) {
  const data = slug ? getSeoData(slug) : DEFAULT_SEO;
  return <ToolContent {...data} />;
}
