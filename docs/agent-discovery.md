# Agent discovery surfaces

Quick reference for what devtils publishes for AI-agent discoverability,
and — equally important — what we deliberately don't publish and why.
A future audit that flags one of the "won't ship" items should land here
first; the rationale is the answer.

## What devtils publishes

| Surface | Location | Spec |
|---|---|---|
| Markdown summary | `/llms.txt` | [llmstxt.org](https://llmstxt.org) |
| Markdown summary (typo redirect) | `/llm.txt` → 301 → `/llms.txt` | — |
| Agent index | `/.well-known/agent-index.json` | DNS-AID draft |
| API catalog (linkset) | `/.well-known/api-catalog` | RFC 9727 (linkset per RFC 9264) |
| MCP Server Card | `/.well-known/mcp/server-card.json` | SEP-1649 (model-context-protocol/modelcontextprotocol#2127) |
| MCP server endpoint | `/api/mcp` | MCP spec 2025-03-26 (Streamable HTTP, JSON-RPC 2.0) |
| Agent Skills index | `/.well-known/agent-skills/index.json` | Cloudflare Agent Skills Discovery RFC v0.2.0 |
| Per-skill SKILL.md | `/.well-known/agent-skills/<skill>/SKILL.md` | Cloudflare Agent Skills Discovery RFC v0.2.0 |
| WebMCP browser tools | injected at runtime via `navigator.modelContext.provideContext()` from `<WebMcpProvider>` in the root layout | [WebMCP draft](https://webmachinelearning.github.io/webmcp/) |
| Web app manifest | `/manifest.webmanifest` | W3C app manifest |
| Sitemap | `/sitemap.xml` | sitemaps.org |
| robots.txt with Content-Signal | `/robots.txt` | [contentsignals.org](https://contentsignals.org), draft-romm-aipref-contentsignals |
| JSON-LD on tool pages | inline `<script type="application/ld+json">` | schema.org WebApplication / BreadcrumbList / FAQPage / HowTo |
| Per-page Markdown content negotiation | any page with `Accept: text/markdown` | Cloudflare "Markdown for Agents" pattern |
| OG card per tool | `/tools/[slug]/opengraph-image.tsx` | OpenGraph |
| `Link` response headers | every route | RFC 8288 |
| DNS-AID records | (configure at registrar — see `docs/dns-aid.md`) | draft-mozleywilliams-dnsop-dnsaid |

## What we deliberately don't publish

### OAuth / OIDC discovery metadata

**Not publishing** any of:

- `/.well-known/openid-configuration` (OIDC Discovery 1.0)
- `/.well-known/oauth-authorization-server` (RFC 8414)
- `/.well-known/oauth-protected-resource` (RFC 9728)

These three are structurally identical from devtils' perspective: each
describes a piece of a real OAuth deployment (an authorization server, an
OIDC provider, or a protected resource). None of those exist here.
Every mandatory field in each document — `issuer`,
`authorization_endpoint`, `token_endpoint`, `jwks_uri`,
`grant_types_supported`, `resource`, `authorization_servers`,
`scopes_supported` — would point at endpoints that 404.

**Why**: there is no authentication on this site. Every tool runs in the
browser. There are no accounts, no sessions, no tokens, no protected
APIs. Publishing OAuth/OIDC metadata would advertise an authorization
server that does not exist — every endpoint it points at would 404, and
any agent attempting to authenticate would fail with an opaque error.

There's also a small security argument: a published, well-known discovery
URL with stale values creates a soft "MITM template" — an attacker who
later compromises any layer between client and origin can swap the
endpoint values and direct agents at attacker-controlled URLs. Empty is
strictly safer than wrong here.

**When to revisit**: if devtils ever ships a paid tier with a callable
API (the registry's `tier: 'pro'` / `tier: 'ai'` work was scoped out for
the launch), that's the point to add **all three** of these documents
together — they're a set, not à la carte. The metadata must point at
endpoints that actually exist and return spec-conformant responses; until
then, no metadata is the correct posture. An audit item that flags any
one of these in isolation is template-checking the URL existence, not
the underlying capability — the docs entry here is the answer.

### Health endpoint

Not publishing `/health` or `/status`. No service exists for the endpoint
to report on — the tools either render (200) or don't (5xx from the host
itself). The hosting provider's status page is the truth source.

### OpenAPI specification (`service-desc` link)

Not publishing an OpenAPI JSON. Same reason as OAuth: there is no API to
describe. The `api-catalog` linkset uses `service-doc` (links to relevant
specs / docs) rather than `service-desc` (links to a formal API
description) for the same reason — it would have to be empty.

## Posture statement

devtils is a client-side utility site. The discovery surfaces we publish
describe the **content** the site offers (tools, catalogues, docs) and
their **machine-readable representations** (Markdown, JSON-LD, OG cards).
We do not publish discovery surfaces for **services we don't run**
(authentication, callable APIs, health endpoints). Adding those before
the underlying service exists trades a green checkmark on an audit for
real correctness risk.
