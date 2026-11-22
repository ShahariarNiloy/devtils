import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Paste a JSON Web Token to decode its header and payload, see which checks a server would run (signature, expiry, not-before, issuer, audience, clock leeway) and verify the signature in your browser with Web Crypto: HS256/384/512 with a secret, RS, PS and ES with a PEM, JWK or JWKS. You can also edit the claims and re-sign a test token. Nothing leaves the tab.",
  usesTitle: "What developers use it for",
  usesNote: "Answering “why is this token rejected?”",
  useCases: [
    {
      tag: "401",
      tint: "clay",
      title: "Debug a 401",
      description: "See which check fails: expiry, audience, issuer or signature.",
    },
    {
      tag: "keys",
      tint: "teal",
      title: "Check a key rotation",
      description: "Paste a JWKS and confirm the kid resolves to a key that verifies.",
    },
    {
      tag: "test",
      tint: "sage",
      title: "Make test tokens",
      description: "Edit claims, expire a token on purpose, re-sign with a test secret.",
    },
    {
      tag: "audit",
      tint: "rose",
      title: "Audit what's inside",
      description: "Spot long lifetimes, unsigned tokens and personal data in claims.",
    },
  ],
  faqs: [
    {
      question: "Is my token sent anywhere?",
      answer:
        "No. Decoding and verifying happen in this tab with your browser's Web Crypto. We never fetch keys on our own. The only request is the one you trigger with “Fetch issuer's keys”, and it goes to the issuer without your token.",
    },
    {
      question: "What's the difference between decoding and verifying?",
      answer:
        "Anyone can decode a JWT, because the header and payload are only Base64URL-encoded. Verifying checks the signature with the secret or public key, which proves the token wasn't changed.",
    },
    {
      question: "Why is a fresh token rejected?",
      answer:
        "Usually clock skew: the server's clock is a little behind the issuer's, so iat or nbf looks like it's in the future. Most libraries allow a leeway of 30 to 60 seconds. Try the leeway setting.",
    },
    {
      question: "What's wrong with alg: none?",
      answer:
        "It means the token isn't signed, so anyone can create one. Always pin the algorithms your server accepts instead of trusting the token's header.",
    },
    {
      question: "Why does a big ID show a warning?",
      answer:
        "JavaScript numbers lose precision past 9,007,199,254,740,991. We show the exact value from the token and warn you, because JSON.parse would silently round it.",
    },
  ],
  relatedSlugs: ["json-formatter", "base64", "timestamp-converter", "password-generator"],
} as const;

export function JwtDecoderContent() {
  return <ToolContent {...seoData} />;
}
