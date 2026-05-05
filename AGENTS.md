<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# DevToolbox — agent guide

This file is for AI coding agents (Claude Code, Cursor, etc.). Humans should
start with `README.md`. The goal is to give you the smallest set of constraints
that keep new contributions feeling handcrafted instead of "AI-template-y".

## What this app is

DevToolbox is a developer-utility web app: format JSON, convert text cases,
encode/decode Base64, test regex, convert colors. The bar is **Linear / Vercel
/ Raycast polish** — typography, motion, micro-interactions all matter. Don't
ship something that looks like every other Next.js + shadcn site.

## Hard rules

1. **Tailwind v4, CSS-first config.** No `tailwind.config.js`. Tokens live in
   `@theme` inside `src/app/globals.css`. Light mode flips them on
   `[data-theme="light"]`.
2. **Don't install shadcn/ui.** Primitives in `src/components/primitives/` wrap
   Radix directly with our own styling. Match that pattern; don't paste shadcn.
3. **TypeScript strict, no `any`, minimal `as` casts.** If you need a cast, ask
   whether you can change the type instead.
4. **Keep tool logic pure.** Anything in `src/components/tools/<slug>/*.lib.ts`
   should not import React or DOM globals beyond `TextEncoder`/`atob`. The
   `<Tool>.tsx` component is the only place state and effects live.
5. **`'use client'` only when you must.** Pages, layouts, and the app shell are
   RSC. Tools and stateful UI are client components.
6. **Brand chartreuse (`--color-brand`) is an accent.** Never use it as a fill
   color on large surfaces — it goes on primary buttons, focus rings, active
   indicators, hover accents.
7. **Respect `prefers-reduced-motion`.** A global override exists; don't fight
   it with `!important`.
8. **Async params.** Next.js 16 page/layout `params` and `searchParams` are
   `Promise<>`. Always `await` them. Use `PageProps<'/path'>` when typing.

## Where things live

- `src/lib/tools-registry.ts` — every tool is registered here. The homepage,
  sidebar counts, command palette, and dynamic route all read from this list.
- `src/app/tools/[slug]/page.tsx` — wires registry slugs to `<Component>`s in
  `componentMap`. Add new tools here too.
- `src/components/primitives/` — styled Radix wrappers. If a new tool needs a
  primitive that's not here yet, add it here, don't inline the Radix import in
  the tool component.
- `src/components/layout/ToolShell.tsx` — the per-tool shell. New tools should
  render inside `<ToolShell tool={tool}>`.
- `src/lib/keyboard.ts` — `useShortcut()` for cross-platform meta-key shortcuts.

## Adding a new tool — checklist

1. Append a `Tool` entry to `tools-registry.ts`.
2. Create `src/components/tools/<slug>/<slug>.lib.ts` — pure helpers.
3. Create `src/components/tools/<slug>/<Component>.tsx` — `"use client"`,
   takes `{ tool }: { tool: Tool }`, wraps in `<ToolShell>`.
4. Add the import + map entry in `src/app/tools/[slug]/page.tsx`.
5. If a new icon is needed, register it in `src/components/icon.tsx`.

## Style conventions worth keeping

- Card paddings tend to be `p-3` to `p-4`; section gutters `gap-4`. Don't drift
  to bigger radii than `rounded-xl` (`12px`) on cards or `rounded-lg` (`8px`)
  on inputs.
- Body text is `text-[12.5px]` to `text-[13px]`. Headings on tool pages are
  `text-[28px] font-medium tracking-tight`. Editorial sub-copy uses
  `var(--font-serif)` italic.
- Code panels use `font-mono text-[12.5px] leading-[1.65]`.
- Toast: always go through `sonner` (`import { toast } from "sonner"`).

## Things to avoid

- Don't introduce `tailwind.config.js`. v4 doesn't need one.
- Don't add `<head>` / `<meta>` directly — use `export const metadata` or
  `generateMetadata` per page.
- Don't reach for `useEffect` for things derivable in render.
- Don't add a feature flag or environment variable for tool-level concerns.
  Tools are static-renderable client components.
- Don't break the registry-driven flow by hard-coding tools in two places.
