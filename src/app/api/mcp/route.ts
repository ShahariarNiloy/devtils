import { dispatch } from "@/lib/mcp/dispatch";
import {
  rpcError,
  RpcErrors,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "@/lib/mcp/protocol";

/**
 * MCP Streamable HTTP transport endpoint (spec 2025-03-26). A single URL
 * accepts JSON-RPC 2.0 requests via POST, returns JSON-RPC responses.
 *
 * Our handlers are all synchronous + stateless, so we never need the
 * server-streaming behaviour Streamable HTTP allows for long-running ops
 * — every response is a single JSON body. SSE is optionally supported by
 * MCP clients; if a client requires it we'd add an `Accept: text/event-
 * stream` branch that wraps the same dispatch in an SSE envelope, but
 * the spec lets servers choose.
 *
 * Notifications (JSON-RPC messages without an `id`) and `notifications/*`
 * methods get a 204 No Content — that's the spec-compliant
 * "acknowledged, nothing to return" response.
 *
 * No sessions, no auth — every call is independent. The OAuth audit
 * deliberately said "no" to authentication on this site; the MCP server
 * inherits that posture. If we ever add a paid tier, this is where the
 * `Authorization: Bearer …` check would land alongside the matching
 * `/.well-known/oauth-protected-resource` metadata.
 */

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      rpcError(null, RpcErrors.PARSE_ERROR, "request body is not valid JSON"),
      400,
    );
  }

  // A client may send either a single JSON-RPC request or a batch.
  // We support both; the batch path just maps dispatch over the array
  // and filters out null entries (notifications).
  if (Array.isArray(body)) {
    const results = await Promise.all(
      body.map((r) =>
        isValidRequest(r)
          ? dispatch(r)
          : Promise.resolve(
              rpcError(null, RpcErrors.INVALID_REQUEST, "malformed JSON-RPC entry"),
            ),
      ),
    );
    const responses = results.filter((r): r is JsonRpcResponse => r !== null);
    if (responses.length === 0) return new Response(null, { status: 204 });
    return jsonResponse(responses, 200);
  }

  if (!isValidRequest(body)) {
    return jsonResponse(
      rpcError(null, RpcErrors.INVALID_REQUEST, "not a JSON-RPC 2.0 request"),
      400,
    );
  }

  const response = await dispatch(body);
  if (response === null) return new Response(null, { status: 204 });
  return jsonResponse(response, 200);
}

export function GET(): Response {
  // GET on the MCP endpoint is a no-op in our setup (we don't use SSE
  // for server-pushed messages). Reply with a small JSON pointer so a
  // curious browser request gets a meaningful body, not a 404.
  return jsonResponse(
    {
      transport: "streamable-http",
      protocolVersion: "2025-03-26",
      note: "POST a JSON-RPC 2.0 request to this URL. See /.well-known/mcp/server-card.json for the card.",
    },
    200,
  );
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Don't cache MCP responses — each invocation is unique.
      "Cache-Control": "no-store",
    },
  });
}

function isValidRequest(v: unknown): v is JsonRpcRequest {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return r.jsonrpc === "2.0" && typeof r.method === "string";
}
