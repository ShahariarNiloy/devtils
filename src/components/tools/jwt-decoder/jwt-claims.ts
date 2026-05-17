import {
  formatAbsoluteTime,
  formatRelativeTime,
} from "./jwt-decoder.lib";
import type {
  ClaimMeta,
  KnownIssuer,
  ParsedJwt,
  SecurityWarning,
} from "./jwt-decoder.types";

export const STANDARD_CLAIMS: Record<string, ClaimMeta> = {
  iss: {
    label: "Issuer",
    rfcSection: "RFC 7519 §4.1.1",
    description:
      "Principal that issued the JWT. Often a URL identifying the auth server.",
  },
  sub: {
    label: "Subject",
    rfcSection: "RFC 7519 §4.1.2",
    description: "Principal that is the subject of the JWT (usually the user).",
  },
  aud: {
    label: "Audience",
    rfcSection: "RFC 7519 §4.1.3",
    description: "Recipients the JWT is intended for. Must be validated.",
  },
  exp: {
    label: "Expiration",
    rfcSection: "RFC 7519 §4.1.4",
    description: "After this time the JWT must not be accepted.",
    isDate: true,
  },
  nbf: {
    label: "Not before",
    rfcSection: "RFC 7519 §4.1.5",
    description: "Before this time the JWT must not be accepted.",
    isDate: true,
  },
  iat: {
    label: "Issued at",
    rfcSection: "RFC 7519 §4.1.6",
    description: "Time at which the JWT was issued. Used to determine age.",
    isDate: true,
  },
  jti: {
    label: "JWT ID",
    rfcSection: "RFC 7519 §4.1.7",
    description: "Unique identifier for the JWT; prevents replay.",
  },
  azp: {
    label: "Authorized party",
    rfcSection: "OpenID Connect",
    description: "The party to which the token was issued.",
  },
  scope: {
    label: "Scope",
    rfcSection: "RFC 8693",
    description: "Space-delimited list of granted scopes.",
  },
  roles: {
    label: "Roles",
    rfcSection: "Provider-specific",
    description: "Application roles granted to the subject.",
  },
  permissions: {
    label: "Permissions",
    rfcSection: "Provider-specific",
    description: "Fine-grained permissions granted to the subject.",
  },
  email: {
    label: "Email",
    rfcSection: "OpenID Connect",
    description: "End-user email address.",
  },
  name: {
    label: "Name",
    rfcSection: "OpenID Connect",
    description: "End-user display name.",
  },
};

interface IssuerRule {
  issuer: KnownIssuer;
  label: string;
  test: (iss: string) => boolean;
  jwks?: (iss: string) => string;
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
    test: (i) => /securetoken\.google\.com/.test(i),
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
    jwks: (i) => `${trimSlash(i)}/v1/keys`,
  },
  {
    issuer: "supabase",
    label: "Supabase",
    test: (i) => /\.supabase\.co/.test(i),
  },
  {
    issuer: "entra",
    label: "Microsoft Entra ID",
    test: (i) => /login\.microsoftonline\.com/.test(i) || /sts\.windows\.net/.test(i),
  },
  {
    issuer: "aws",
    label: "AWS",
    test: (i) => /amazonaws\.com/.test(i),
  },
];

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

export function detectIssuer(iss: string): KnownIssuer | null {
  const rule = ISSUERS.find((r) => r.test(iss));
  return rule ? rule.issuer : null;
}

export function issuerLabel(iss: string): string | null {
  const rule = ISSUERS.find((r) => r.test(iss));
  return rule ? rule.label : null;
}

export function suggestedJwksUrl(iss: string): string | null {
  const rule = ISSUERS.find((r) => r.test(iss));
  return rule?.jwks ? rule.jwks(iss) : null;
}

export function humanizeClaim(key: string, value: unknown): string {
  const meta = STANDARD_CLAIMS[key];
  if (meta?.isDate && typeof value === "number") {
    return `${formatAbsoluteTime(value)} (${formatRelativeTime(value)})`;
  }
  if (key === "iss" && typeof value === "string") {
    const label = issuerLabel(value);
    return label ? `${value} · ${label}` : value;
  }
  if (Array.isArray(value)) return value.join(", ");
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function getSecurityWarnings(jwt: ParsedJwt): SecurityWarning[] {
  const w: SecurityWarning[] = [];
  const { header, payload } = jwt;

  if (header.alg === "none") {
    w.push({
      severity: "critical",
      title: "Algorithm is “none”",
      description:
        "An unsigned token. Any party can forge claims — never accept alg:none in production.",
    });
  }

  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const iat = typeof payload.iat === "number" ? payload.iat : undefined;

  if (exp === undefined) {
    w.push({
      severity: "warning",
      title: "No expiration (exp)",
      description: "This token never expires — a long-lived credential risk.",
    });
  }
  if (iat === undefined) {
    w.push({
      severity: "info",
      title: "No issued-at (iat)",
      description: "Token age cannot be determined without an iat claim.",
    });
  }
  if (exp !== undefined && iat !== undefined && exp - iat > 31536000) {
    w.push({
      severity: "warning",
      title: "Unusually long lifetime",
      description:
        "The token is valid for more than a year. Prefer short-lived tokens with refresh.",
    });
  }
  if (Array.isArray(payload.aud) && payload.aud.length > 1) {
    w.push({
      severity: "info",
      title: "Multiple audiences",
      description: "aud is an array — ensure every consumer validates its own audience.",
    });
  }
  return w;
}
