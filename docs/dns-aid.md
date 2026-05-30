# DNS for AI Discovery (DNS-AID) — records to publish

DNS-AID (draft-mozleywilliams-dnsop-dnsaid) advertises agent-readable
endpoints via SVCB / HTTPS DNS records under a well-known prefix:
`_<service>._agents.<domain>`. This file lists the exact records to add at
your DNS provider for `utilyx.dev`. None of this is configurable in
application code — DNS lives outside the app.

## What you publish

Three records, all SVCB (`HTTPS` is an SVCB family member). Replace
`utilyx.dev.` with your own zone.

```dns
;; ── DNS-AID entry — points at /.well-known/agent-index.json ──
;; The "index" service is the canonical entry point for agents that
;; understand the DNS-AID draft. Resolvers follow the HTTPS record to
;; reach the JSON document at /.well-known/agent-index.json.
_index._agents.utilyx.dev.    3600  IN  HTTPS  1  utilyx.dev.  (
    alpn=h2
    endpoint=/.well-known/agent-index.json )

;; ── llms.txt advertisement ──
;; Agents that look for the llmstxt.org convention find /llms.txt directly,
;; but advertising it here means agents that ONLY speak DNS-AID can also
;; reach it without a Link-header round trip.
_llms._agents.utilyx.dev.     3600  IN  HTTPS  1  utilyx.dev.  (
    alpn=h2
    endpoint=/llms.txt )

;; ── sitemap advertisement ──
_sitemap._agents.utilyx.dev.  3600  IN  HTTPS  1  utilyx.dev.  (
    alpn=h2
    endpoint=/sitemap.xml )
```

The `alpn=h2` parameter advertises HTTP/2 over TLS — the protocol the
production site actually serves. If you also serve plain HTTP/1.1 (e.g. for
older fetchers), add `alpn=h2,http/1.1`.

## DNSSEC

The DNS-AID draft strongly recommends signing the `_agents` zone with
DNSSEC so a validating resolver returns authenticated data. If you're on:

- **Cloudflare** — enable DNSSEC at the zone level in the dashboard. New
  records sign automatically.
- **Route 53** — see "Enabling DNSSEC signing" in the Route 53 docs; one
  KSK + ZSK setup signs the whole zone.
- **Other** — sign the `_agents` subzone or the apex; either works.

Without DNSSEC the records still resolve and current agents still consume
them, but a network attacker between the resolver and your authoritative
server could swap an `endpoint=...` value. DNSSEC closes that.

## How to verify after publishing

```bash
# Plain lookup — should return the HTTPS record with svcparam fields.
dig +short HTTPS _index._agents.utilyx.dev

# Including DNSSEC validation (ad flag set when authenticated).
dig +dnssec HTTPS _index._agents.utilyx.dev

# End-to-end — fetch what the record points at.
curl https://utilyx.dev/.well-known/agent-index.json | jq .
```

The JSON at the endpoint advertises every machine-readable surface the
site exposes — `llms.txt`, sitemap, manifest, robots — plus a per-tool
capabilities list. That endpoint is built and served by this Next.js app
at `src/app/.well-known/agent-index.json/route.ts`; the DNS records just
help agents find it.

## Notes on the draft status

DNS-AID is **not yet a published RFC** — it's an active IETF draft
(`draft-mozleywilliams-dnsop-dnsaid`). Few agents implement it today.
Publishing the records is forward-looking infrastructure: it costs
nothing to maintain, breaks nothing, and is in place when consumers
arrive. Watch the draft for any schema or naming-convention changes
before the spec stabilises.
