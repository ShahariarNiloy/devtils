/**
 * MCP protocol types — the subset we implement. Spec version `2025-03-26`
 * (Streamable HTTP transport). JSON-RPC 2.0 over a single HTTP endpoint.
 *
 * Implemented directly rather than via @modelcontextprotocol/sdk because:
 *   1. The SDK assumes Node stdio / SSE bridging that doesn't fit a Next.js
 *      route handler cleanly.
 *   2. The protocol surface we need is small (initialize + tools/list +
 *      tools/call + resources/list + resources/read) — ~200 lines including
 *      types is cheaper than carrying the SDK's full machinery.
 *   3. The pure `*.lib.ts` discipline already in the codebase maps 1:1 onto
 *      tool handlers; an extra abstraction layer would obscure rather than
 *      help.
 */

export const MCP_PROTOCOL_VERSION = "2025-03-26";
export const SERVER_NAME = "devtils";
export const SERVER_VERSION = "0.1.0";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/** Standard JSON-RPC error codes plus MCP-specific ones. */
export const RpcErrors = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

export interface Tool {
  /** snake_case identifier — what clients pass to `tools/call`. */
  name: string;
  /** One-line description shown in tool pickers. */
  description: string;
  /** JSON Schema for the `arguments` field of `tools/call`. */
  inputSchema: Record<string, unknown>;
  /** Pure handler. Throws to signal failure (caught + reported as RPC error). */
  handler: (args: unknown) => Promise<ToolCallResult> | ToolCallResult;
}

/** MCP tool-call response shape. */
export interface ToolCallResult {
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
    | { type: "resource"; resource: { uri: string; mimeType?: string; text?: string } }
  >;
  isError?: boolean;
}

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  /** Returns the resource body for `resources/read`. */
  read: () => Promise<string> | string;
}

export function rpcOk(id: JsonRpcResponse["id"], result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(
  id: JsonRpcResponse["id"],
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}
