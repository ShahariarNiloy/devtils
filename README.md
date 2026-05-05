# DevToolbox

Tiny developer tools, exactly where you reach for them.

DevToolbox is a beautifully crafted web app of essential utilities for developers. Format JSON, convert text cases, encode/decode Base64, test regex patterns, convert between colors, and more — all keyboard-first, offline-capable, and built with the same care you'd give your product's frontend.

## What's inside

- **JSON Formatter** — Pretty-print, minify, validate, and sort JSON with syntax highlighting
- **Text Case Converter** — Snake case, camel case, kebab case, title case, and more
- **Base64 Encoder/Decoder** — Encode and decode Base64 strings instantly
- **Regex Tester** — Test regex patterns with live match highlighting and flags
- **Color Converter** — Convert between hex, RGB, HSL with WCAG contrast checker
- **More tools coming** — Constantly expanding the toolkit

## Why DevToolbox

- **Keyboard-first** — Press `⌘ K` (or `Ctrl K`) from anywhere to search and jump between tools
- **Offline** — All tools run locally in your browser; nothing leaves your machine
- **Dark & light mode** — Thoughtfully designed for both themes
- **Lightning fast** — No spinners, no lag. Pure client-side performance
- **Accessible** — Built with modern web standards and keyboard navigation throughout
- **Beautiful** — Attention to typography, motion, micro-interactions, and the details that matter

## Get started

Visit [devtoolbox.app](https://devtoolbox.app) and start using tools immediately — no signup, no ads, no tracking.

**Pro tip:** Bookmark the site or add it to your home screen for instant access from anywhere.
tier: "free",
icon: "Hash", // any name from src/components/icon.tsx
tags: ["uuid", "id"],
}

```

2. Create `src/components/tools/uuid-generator/`:

- `uuid-generator.lib.ts` — pure logic (no React imports). All transformation, validation, and parsing belongs here.
- `UuidGenerator.tsx` — a `"use client"` component that takes `{ tool: Tool }` and renders inside `<ToolShell>`.

3. Wire it into `src/app/tools/[slug]/page.tsx` by adding it to `componentMap`. `generateStaticParams` automatically picks it up from the registry.

4. If your tool needs a new icon, import the Lucide component and register it in `src/components/icon.tsx`.

That's it — the homepage card, command palette entry, sidebar count, and breadcrumb are all driven by the registry.

## Architecture notes

- **All tool logic is pure and lives in `*.lib.ts`** — that keeps the React layer skinny and the logic easy to test with any runner.
- **TypeScript strict** is on. We don't use `any` and only use `as` casts where parsing-from-DOM forces it.
- **Server vs. client** — pages and the AppShell are RSC; tools, palette, theme toggle, and anything stateful are `"use client"`.
- **Accessibility** — Radix gives us focus traps, ARIA attributes, and keyboard nav for free. We add a skip link, visible focus rings (chartreuse, 2px outline + 2px offset), and contrast that passes WCAG AA in both modes (run the Color Converter against `--color-text-muted` and `--color-bg` to verify).
- **Keyboard shortcuts** — `useShortcut` in `lib/keyboard.ts` handles cross-platform `meta` (⌘ on macOS, Ctrl elsewhere) and skips when the focus is in a text input unless the shortcut is itself meta-prefixed.
- **Recents** — the command palette persists the last 4 visited tools via `localStorage`; `pushRecent()` is exposed so any tool that wants to mark itself visited can.

## Browser support

Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+ — same baseline as Next.js 16.
```
