/**
 * Type declarations for the WebMCP browser API. Spec lives at
 * https://webmachinelearning.github.io/webmcp/. No browser has it as a
 * built-in TypeScript type yet, so we declare the surface we touch.
 *
 * Augmenting `Navigator` rather than `globalThis` keeps the types scoped
 * to where the API actually lives. The presence check at runtime
 * (`"modelContext" in navigator`) is what we rely on for fallback
 * behaviour; the types just stop TS from erroring on the calls.
 */

export interface WebMcpTool {
  /** Unique identifier — same kebab/snake_case convention as the server tools. */
  name: string;
  description: string;
  /** Standard JSON Schema for the arguments. */
  inputSchema: Record<string, unknown>;
  /**
   * Called when the agent invokes the tool. Returns a string the agent
   * will treat as the result, or an object that the runtime will serialise.
   * Throw to signal a failure to the agent.
   */
  execute: (args: Record<string, unknown>) => Promise<string | object> | string | object;
}

export interface WebMcpContext {
  tools: WebMcpTool[];
}

export interface ModelContextApi {
  /**
   * Replaces the current tool set the page advertises to the embedded
   * agent. Calling twice replaces the previous registration; passing an
   * empty array clears it. Idempotent.
   */
  provideContext: (context: WebMcpContext) => void | Promise<void>;
}

declare global {
  interface Navigator {
    modelContext?: ModelContextApi;
  }
}

export {};
