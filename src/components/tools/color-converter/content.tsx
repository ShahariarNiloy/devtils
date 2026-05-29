import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "Convert colours between every common format: HEX, RGB, HSL, HSB, OKLCH, OKLab, and named CSS colours. Live preview shows the colour itself plus accessibility metadata: contrast against black and white, WCAG ratings, and a perceptual lightness scale. Round-trip accuracy is preserved by working in OKLab internally where the colour space supports it.",
  useCases: [
        {
          title: "Building a design token system",
          description:
            "Drop a brand HEX, get the OKLCH equivalent for use in Tailwind v4's @theme directive. The perceptual colour space gives you smoother gradient interpolation than HSL.",
        },
        {
          title: "Verifying accessibility contrast",
          description:
            "Check whether your text + background pair meets WCAG AA (4.5:1) or AAA (7:1). The ratio updates as you tweak either colour, so you can find the closest passing variant.",
        },
        {
          title: "Translating between design tool formats",
          description:
            "Figma uses HEX, CSS uses HSL / OKLCH, design specs use RGB — the converter handles the round-tripping without precision drift.",
        },
        {
          title: "Generating dark-mode pairs",
          description:
            "Use the inverted-lightness view to see what your colour looks like flipped for dark mode. Useful when designing palettes that need to read correctly in both themes.",
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
            "Use the system colour picker (eyedropper icon when available in supporting browsers) to sample any pixel on screen. Otherwise paste a HEX directly.",
        },
        {
          question: "Does it support P3 / wide-gamut colours?",
          answer:
            "Yes — OKLCH and OKLab can describe colours outside the sRGB gamut. The preview swatch shows a clipped sRGB version when your screen can't render the wider gamut, with a hint that the colour exceeds sRGB.",
        },
      ],
  relatedSlugs: ["color-picker", "color-palette-generator", "color-blindness-simulator", "css-gradient"],
} as const;

export function ColorConverterContent() {
  return <ToolContent {...seoData} />;
}
