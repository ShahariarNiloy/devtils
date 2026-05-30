"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { mcpToolsAsWebMcp } from "@/lib/webmcp/from-mcp";
import type { WebMcpTool } from "@/lib/webmcp/types";
import { TOOLS } from "@/lib/tools-registry";

/**
 * WebMCP provider. Calls `navigator.modelContext.provideContext()` on
 * mount with every tool the site exposes to an in-browser agent.
 *
 * Two flavours of tools are advertised:
 *
 *   1. Pure compute tools — the same 14 handlers our server-side MCP
 *      exposes at /api/mcp. These run entirely in the page; agents that
 *      don't have outbound HTTP can still invoke them.
 *   2. UI-affecting tools — actions a remote MCP server cannot perform
 *      because they require the user's browser context: navigating to a
 *      tool page, flipping the theme, listing what's available.
 *
 * The WebMCP API (https://webmachinelearning.github.io/webmcp/) is not in
 * any shipping browser yet. Without `navigator.modelContext`, we silently
 * no-op — no console noise, no thrown errors, no degraded UX. When a
 * browser ships the API (or a polyfilling extension installs it), the
 * tools become available immediately on next page load.
 */
export function WebMcpProvider() {
  const router = useRouter();
  const { setTheme } = useTheme();

  // Build the tool list once per (router, setTheme) pair. Both are stable
  // for the lifetime of the component in practice, so this runs once.
  const tools = useMemo<WebMcpTool[]>(() => {
    const computeTools = mcpToolsAsWebMcp();

    const uiTools: WebMcpTool[] = [
      {
        name: "utilyx_list_tools",
        description:
          "List every tool the site provides — slug, name, category, and human description. Use this to discover what's available before navigating or invoking.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        execute: () => ({
          tools: TOOLS.map((t) => ({
            slug: t.slug,
            name: t.name,
            category: t.category,
            description: t.description,
            url: `/tools/${t.slug}`,
          })),
        }),
      },
      {
        name: "utilyx_goto_tool",
        description:
          "Navigate the user to a specific site tool page in the same tab. Pass the tool slug (e.g. 'json-to-typescript'). Use utilyx_list_tools to discover slugs.",
        inputSchema: {
          type: "object",
          required: ["slug"],
          properties: {
            slug: {
              type: "string",
              description: "Tool slug, kebab-case.",
            },
          },
        },
        execute: (args) => {
          const slug = typeof args.slug === "string" ? args.slug : "";
          const tool = TOOLS.find((t) => t.slug === slug);
          if (!tool) {
            throw new Error(
              `unknown tool slug: ${slug || "(empty)"}. Call utilyx_list_tools first.`,
            );
          }
          router.push(`/tools/${tool.slug}`);
          return `Navigated to ${tool.name} (/tools/${tool.slug}).`;
        },
      },
      {
        name: "utilyx_set_theme",
        description:
          "Set the site theme. Accepts 'light', 'dark', or 'system' (follow OS preference).",
        inputSchema: {
          type: "object",
          required: ["theme"],
          properties: {
            theme: {
              type: "string",
              enum: ["light", "dark", "system"],
            },
          },
        },
        execute: (args) => {
          const theme = args.theme;
          if (theme !== "light" && theme !== "dark" && theme !== "system") {
            throw new Error(
              `theme must be 'light', 'dark', or 'system' (got ${JSON.stringify(theme)})`,
            );
          }
          setTheme(theme);
          return `Theme set to ${theme}.`;
        },
      },
    ];

    return [...computeTools, ...uiTools];
  }, [router, setTheme]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const api = navigator.modelContext;
    if (!api || typeof api.provideContext !== "function") return;

    // The spec says calling provideContext replaces the previous
    // registration. Best-effort cleanup on unmount clears it so a tab
    // navigating away doesn't leave stale tool advertisements bound to a
    // dead React tree.
    try {
      api.provideContext({ tools });
    } catch {
      // Implementations may reject if the page isn't visible / focused
      // yet. We don't retry — the next mount (route change, theme toggle
      // re-render) will try again, which is good enough for our needs.
    }

    return () => {
      try {
        api.provideContext({ tools: [] });
      } catch {
        // Same rationale — best effort.
      }
    };
  }, [tools]);

  return null;
}
