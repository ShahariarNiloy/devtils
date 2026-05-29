/**
 * Adapter that re-shapes the server-side MCP tools as WebMCP tools.
 *
 * The MCP handler contract returns a `ToolCallResult` with content blocks
 * + an `isError` flag. WebMCP just wants a string back, with thrown
 * exceptions signalling failure. We unwrap the first text block, and
 * throw if the MCP handler set `isError: true` so the in-browser agent
 * sees a real failure (not a success containing the word "error").
 *
 * Importantly, the MCP handlers are PURE. They don't touch the DOM, fetch
 * over the network, or read React state — every tool calls into a
 * `*.lib.ts` module under `src/components/tools/`. That's why we can run
 * the same code on the server (for /api/mcp) and in the browser (for
 * WebMCP) with zero divergence: same input → same output everywhere.
 */
import { listTools } from "@/lib/mcp/tools";
import type { ToolCallResult } from "@/lib/mcp/protocol";
import type { WebMcpTool } from "./types";

function extractText(result: ToolCallResult): string {
  const first = result.content[0];
  if (!first) return "";
  if (first.type === "text") return first.text;
  // No other content block types are emitted by current MCP tools, but
  // future image/audio blocks should fall through to a useful default
  // rather than throw — agents can re-call with different args if needed.
  return JSON.stringify(first);
}

export function mcpToolsAsWebMcp(): WebMcpTool[] {
  return listTools().map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema as Record<string, unknown>,
    execute: async (args) => {
      const result = await Promise.resolve(t.handler(args));
      const text = extractText(result);
      if (result.isError) {
        // Throwing surfaces the failure to the agent. The string is the
        // same body the MCP `isError: true` content block carried.
        throw new Error(text || "tool execution failed");
      }
      return text;
    },
  }));
}
