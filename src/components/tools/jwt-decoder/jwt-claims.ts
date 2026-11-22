import type { KnownIssuer } from "./jwt-decoder.types";

/** Known identity providers: label + where each publishes its JWKS. Pure. */

interface IssuerRule {
  issuer: KnownIssuer;
  label: string;
  test: (iss: string) => boolean;
  jwks?: (iss: string) => string;
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

const ISSUERS: IssuerRule[] = [
  {
    issuer: "auth0",
    label: "Auth0",
    test: (i) => /\.auth0\.com\/?$/.test(i) || /\.us\.auth0\.com/.test(i),
    jwks: (i) => `${trimSlash(i)}/.well-known/jwks.json`,
  },
  {
    issuer: "clerk",
    label: "Clerk",
    test: (i) => /clerk\./.test(i) || /\.clerk\.accounts\.dev/.test(i),
    jwks: (i) => `${trimSlash(i)}/.well-known/jwks.json`,
  },
  {
    issuer: "cognito",
    label: "AWS Cognito",
    test: (i) => /cognito-idp\.[a-z0-9-]+\.amazonaws\.com/.test(i),
    jwks: (i) => `${trimSlash(i)}/.well-known/jwks.json`,
  },
  {
    issuer: "firebase",
    label: "Firebase",
    test: (i) => /^https:\/\/securetoken\.google\.com\//.test(i),
    jwks: () => "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  },
  {
    issuer: "keycloak",
    label: "Keycloak",
    test: (i) => /\/realms\//.test(i),
    jwks: (i) => `${trimSlash(i)}/protocol/openid-connect/certs`,
  },
  {
    issuer: "okta",
    label: "Okta",
    test: (i) => /\.okta\.com/.test(i) || /\.oktapreview\.com/.test(i),
    jwks: (i) => (/\/oauth2\//.test(i) ? `${trimSlash(i)}/v1/keys` : `${trimSlash(i)}/oauth2/v1/keys`),
  },
  {
    issuer: "supabase",
    label: "Supabase",
    test: (i) => /\.supabase\.co/.test(i),
    jwks: (i) => `${trimSlash(i)}/.well-known/jwks.json`,
  },
  {
    issuer: "entra",
    label: "Microsoft Entra ID",
    test: (i) => /^https:\/\/login\.microsoftonline\.com\/[^/]+\/v2\.0\/?$/.test(i),
    jwks: (i) => trimSlash(i).replace(/\/v2\.0$/, "/discovery/v2.0/keys"),
  },
  {
    issuer: "aws",
    label: "AWS",
    test: (i) => /amazonaws\.com/.test(i),
  },
];

export function detectIssuer(iss: string): KnownIssuer | null {
  return ISSUERS.find((r) => r.test(iss))?.issuer ?? null;
}

export function issuerLabel(iss: string): string | null {
  return ISSUERS.find((r) => r.test(iss))?.label ?? null;
}

export function suggestedJwksUrl(iss: string): string | null {
  const rule = ISSUERS.find((r) => r.test(iss));
  return rule?.jwks ? rule.jwks(iss) : null;
}

/**
 * Where "Fetch issuer's keys" would go for this `iss`: the provider's known
 * JWKS location, else `<iss>/.well-known/jwks.json`. Only plain https URLs
 * qualify (no credentials, no other schemes), so a crafted token can't
 * point the request somewhere odd.
 */
export function jwksUrlFor(iss: unknown): string | null {
  if (typeof iss !== "string" || iss.length > 2048) return null;
  let u: URL;
  try {
    u = new URL(iss);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash) return null;
  return suggestedJwksUrl(iss) ?? `${trimSlash(iss)}/.well-known/jwks.json`;
}
