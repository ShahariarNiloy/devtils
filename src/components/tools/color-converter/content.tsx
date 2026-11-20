import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  usesNote: "One colour, every format your code needs.",
  intro: "Convert colours between every common format: HEX, RGB, HSL, OKLCH, and — from the ⋯ menu — HSB, CMYK, LAB, LCH, the nearest CSS name and the nearest Tailwind colour. A live swatch shows the colour with its WCAG contrast against white and black, plus a nine-step tint and shade scale you can click to use. Everything runs in your browser.",
  useCases: [
        {
          title: "Building a design token system",
          description:
            "Drop a brand HEX, get the OKLCH equivalent for use in Tailwind v4's @theme directive. The perceptual colour space gives you smoother gradient interpolation than HSL.",
        },
        {
          title: "Verifying accessibility contrast",
          description:
            "Ratios against white and black show under the swatch. For any other background, turn on “Contrast on any background” in the ⋯ menu and check whether your pair meets WCAG AA (4.5:1) or AAA (7:1).",
        },
        {
          title: "Translating between design tool formats",
          description:
            "Figma uses HEX, CSS uses HSL / OKLCH, design specs use RGB — the converter handles the round-tripping without precision drift.",
        },
        {
          title: "Building hover and pressed states",
          description:
            "The tint and shade scale mixes your colour towards white and black in 20% steps. Click a step to make it the working colour and copy it in any format — or open the 50–900 ramp from the ⋯ menu for a full token scale.",
        },
      ],
  faqs: [
        {
          question: "What's OKLCH and why use it?",
          answer:
            "OKLCH is a perceptual colour space designed to match human vision. Interpolating between two OKLCH colours produces visually smooth gradients, unlike HSL which can pass through muddy mid-tones. Tailwind v4, the latest CSS specs, and most modern design tools support it natively.",
        },
        {
          question: "Why do RGB → HSL conversions lose precision?",
          answer:
            "HSL has fewer representable values than RGB at the edges (very dark / very light). The converter uses high-precision math internally and only rounds for display.",
        },
        {
          question: "What's the difference between HSL and HSB?",
          answer:
            "HSL: Hue, Saturation, Lightness — `hsl(0, 100%, 50%)` is pure red. HSB (a.k.a. HSV): Hue, Saturation, Brightness — `hsv(0, 100%, 100%)` is pure red. They have the same H but different S/L vs S/B semantics.",
        },
        {
          question: "Why is the WCAG ratio just a number?",
          answer:
            "The ratio is the relative luminance ratio between two colours, ranging from 1 (no contrast) to 21 (pure black on pure white). WCAG AA requires 4.5:1 for body text, 3:1 for large text. AAA requires 7:1 and 4.5:1 respectively.",
        },
        {
          question: "Can I sample a colour from an image?",
          answer:
            "Click the swatch button next to the colour field to open your browser's colour picker. In Chromium browsers it includes an eyedropper that can sample any pixel on screen. Otherwise paste a HEX directly.",
        },
        {
          question: "Does it support P3 / wide-gamut colours?",
          answer:
            "Not yet. Every conversion goes through sRGB, so an OKLCH, LAB or LCH value outside the sRGB gamut is clipped to the nearest sRGB colour before it's shown and converted. Values inside sRGB round-trip exactly.",
        },
      ],
  relatedSlugs: ["color-picker", "color-palette-generator", "color-blindness-simulator", "css-gradient"],
} as const;

export function ColorConverterContent() {
  return <ToolContent {...seoData} />;
}
