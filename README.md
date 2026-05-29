# DevTils

Every tool you need, exactly where you reach for them.

DevTils is a beautifully crafted web app of essential utilities for developers. Format JSON, convert text cases, encode/decode Base64, test regex patterns, convert between colors, and more — all keyboard-first, offline-capable, and built with the same care you'd give your product's frontend.

## What's inside

- **JSON Formatter** — Pretty-print, minify, validate, sort, and convert JSON with syntax highlighting
- **JSON converters** — TypeScript, Zod, Go, Python, Rust, CSV, YAML, XML, JSON Schema
- **Text Case Converter** — Snake, camel, kebab, title case, and more
- **Base64 Encoder/Decoder** — Encode and decode Base64 strings instantly
- **Regex Tester** — Live match highlighting + capture-group inspection
- **Color Converter** — HEX / RGB / HSL / OKLCH with WCAG contrast checker
- **Timestamp Converter** — Unix epoch / ISO 8601 / RFC 2822 across timezones
- **Image Compressor** — JPEG / PNG / WebP / AVIF in the browser via WebAssembly
- **JWT Decoder** — Decode, inspect, verify HS256 signatures locally
- More on the way — see `/tools` for the full catalogue and `/changelog` for what's new.

## Why DevTils

- **Keyboard-first** — Press `⌘ K` (or `Ctrl K`) anywhere to search and jump between tools; press `?` for a shortcut overlay.
- **Offline** — Every tool runs locally in your browser; nothing leaves your machine.
- **Dark & light mode** — Thoughtfully designed for both themes.
- **Lightning fast** — Static-generated pages, syntax-highlighted overlay editor, off-main-thread conversion for large inputs.
- **Accessible** — Skip link, keyboard navigation, focus rings, WCAG AA contrast.
- **Beautiful** — Attention to typography, motion, micro-interactions, and details.

## Get started

Visit [devtils.com](https://devtils.com) and start using tools immediately — no signup, no ads, no tracking.

**Pro tip:** Bookmark the site or add it to your home screen for instant access.

## Adding a new tool

1. **Register the tool** — append a `Tool` entry to `src/lib/tools-registry.ts`:

   ```ts
   {
     slug: "uuid-generator",
     name: "UUID generator",
     description: "Generate v4 and v7 UUIDs with copyable bulk output.",
     category: "Calc",
     tier: "free",
     icon: "fingerprint", // any kebab-case Lucide icon name
     tags: ["uuid", "id", "random"],
   }
   ```

2. **Create the tool directory** at `src/components/tools/uuid-generator/`:

   - `uuid-generator.lib.ts` — pure logic (no React imports). All transformation, validation, parsing belongs here.
   - `uuid-generator.tsx` — `"use client"` component that takes `{ tool: Tool }` and renders inside `<ToolShell>`.
   - `index.ts` — `export { UuidGenerator } from "./uuid-generator";`

3. **Wire it into the component map** at `src/lib/implemented-tools.ts` — add the tool to `COMPONENT_MAP` (keyed by slug). `generateStaticParams` picks it up automatically.

4. **Need a new icon?** No registration step — `<ToolIcon name="kebab-case" />` resolves any Lucide icon at render time. The resolver lives at `src/components/shared/tool-icon.tsx`.

That's it — the homepage card, catalogue, command palette entry, sidebar count, breadcrumb, JSON-LD, and OG image are all driven by the registry.

## Architecture notes

- **Pure tool logic lives in `*.lib.ts`** — keeps the React layer thin and the logic trivially testable.
- **TypeScript strict** — no `any`, minimal `as` casts.
- **Server vs. client** — pages, layouts, and the app shell are RSC; tools and stateful UI are `"use client"`.
- **Per-tool URL state** — options are encoded into query params via `useUrlState` so links are shareable.
- **Worker offloading** — converter inputs over 50KB run in a Web Worker so typing never blocks.
- **The per-tool shell** is `src/components/layout/tool-shell.tsx` (`<ToolShell>`).
- **Primitives** — `src/components/primitives/` wraps Radix directly; don't paste shadcn.
- **Keyboard shortcuts** — `useShortcut` in `src/lib/keyboard.ts` handles cross-platform `meta` (⌘ on macOS, Ctrl elsewhere).
- **Recents** — the command palette persists last visited tools via `localStorage`; `pushRecent()` is exposed for tools that want to self-record.

## Testing

```bash
npm test
```

Runs the emitter fixture suite (90 tests) plus the integrity suite (679 invariant checks across registry / component map / SEO data / related slugs).

## Browser support

Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+ — same baseline as Next.js 16.
