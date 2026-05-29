/**
 * JSON-RPC method dispatcher. Maps each MCP method we implement to a handler
 * that returns the result payload. Keeps the route file thin — the route
 * just parses the request, calls `dispatch()`, and serialises the result.
 */

import { findResource, listResources } from "./resources";
import { findTool, listTools } from "./tools";
import {
  MCP_PROTOCOL_VERSION,
  RpcErrors,
  rpcError,
  rpcOk,
  SERVER_NAME,
  SERVER_VERSION,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./protocol";

export async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;

  // Notifications (no id) — MCP servers shouldn't respond to these. Return
  // null so the caller can omit the body entirely.
  const isNotification = req.id === undefined;

  try {
    switch (req.method) {
      case "initialize":
        return rpcOk(id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false, subscribe: false },
          },
        });

      case "initialized":
      case "notifications/initialized":
        // Client signalling it's ready. No response needed.
        return null;

      case "ping":
        return rpcOk(id, {});

      case "tools/list":
        return rpcOk(id, {
          tools: listTools().map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });

      case "tools/call": {
        const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
        const name = typeof params.name === "string" ? params.name : "";
        const tool = findTool(name);
        if (!tool) {
          return rpcError(id, RpcErrors.INVALID_PARAMS, `unknown tool: ${name}`);
        }
        try {
          const result = await tool.handler(params.arguments);
          return rpcOk(id, result);
        } catch (e) {
          // Tool-level failures are returned as a successful RPC with
          // `isError: true` so the client can introspect — that's the MCP
          // convention for tool errors (vs. transport errors).
          return rpcOk(id, {
            content: [
              {
                type: "text",
                text:
                  e instanceof Error ? e.message : `tool failed: ${String(e)}`,
              },
            ],
            isError: true,
          });
        }
      }

      case "resources/list":
        return rpcOk(id, {
          resources: listResources().map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })),
        });

      case "resources/read": {
        const params = (req.params ?? {}) as { uri?: string };
        const uri = typeof params.uri === "string" ? params.uri : "";
        const resource = findResource(uri);
        if (!resource) {
          return rpcError(id, RpcErrors.INVALID_PARAMS, `unknown resource: ${uri}`);
        }
        const body = await resource.read();
        return rpcOk(id, {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType ?? "text/plain",
              text: body,
            },
          ],
        });
      }

      case "prompts/list":
        // We don't ship prompt templates yet. Returning an empty list is
        // valid per the spec and lets clients introspect the capability set
        // without erroring.
        return rpcOk(id, { prompts: [] });

      default:
        if (isNotification) return null;
        return rpcError(
          id,
          RpcErrors.METHOD_NOT_FOUND,
          `method not implemented: ${req.method}`,
        );
    }
  } catch (e) {
    if (isNotification) return null;
    return rpcError(
      id,
      RpcErrors.INTERNAL_ERROR,
      e instanceof Error ? e.message : String(e),
    );
  }
}
