import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "Paste any JSON Web Token and instantly see its header, payload, and signature, with all standard claims (iss, sub, aud, exp, iat, nbf) decoded and interpreted in human-readable form. Signatures can be verified in the browser — HMAC (HS256/384/512) with a shared secret, RSA, RSA-PSS and ECDSA with a public key — and no token contents ever leave your device.",
  usesNote: "Read a token without pasting it into a server.",
  useCases: [
        {
          title: "Debugging auth flows",
          description:
            "Decode the token your auth provider hands back to your app to verify the claims match what you expect — roles, scopes, expiry. Catches misconfigured issuers and wrong audience values quickly.",
        },
        {
          title: "Checking token expiry mid-incident",
          description:
            "Paste a token from production logs to confirm whether `exp` has passed. The decoded view shows the UTC timestamp and the relative time-to-expiry, and keeps it current while the page is open.",
        },
        {
          title: "Verifying HS256 signatures",
          description:
            "When you have access to the signing secret, paste both and confirm the token's signature is valid. Useful for diagnosing signature drift between issuer and verifier.",
        },
        {
          title: "Learning JWT structure",
          description:
            "Each registered claim is labelled in the decoded view, and time claims are shown as real dates. Useful for understanding what your auth provider is actually putting in the token.",
        },
      ],
  faqs: [
        {
          question: "Does the decoder send my token anywhere?",
          answer:
            "No. Decoding and signature verification both run entirely in your browser. The tool makes no network requests with token contents. Safe for production tokens — never decode a real token on a server you don't control.",
        },
        {
          question: "What does 'signature invalid' mean?",
          answer:
            "Either the secret is wrong, the token was tampered with, or the algorithm used to sign it differs from what you're verifying against. The decoder shows the alg from the header — check it matches what your verifier expects.",
        },
        {
          question: "Can I verify RS256 / ES256 tokens?",
          answer:
            "Yes. HS256/384/512 take the shared secret; RS, PS and ES algorithms take the public key as PEM or JWK, or you can paste the issuer's whole JWKS document and the key is picked by the token's kid. The tool never fetches a JWKS URL — copy the JSON in yourself, so nothing leaves your browser.",
        },
        {
          question: "Why is the `iat` value a giant number?",
          answer:
            "JWT timestamps (`iat`, `exp`, `nbf`) are Unix epoch seconds — seconds since 1970-01-01 UTC. The decoded view converts them to readable date-time format alongside the raw number.",
        },
        {
          question: "What if the token has no signature segment?",
          answer:
            "It's an `alg: none` JWT — explicitly unsigned. These should never be accepted from untrusted sources; the spec allows them but most production systems reject them by default.",
        },
        {
          question: "Can I generate a new JWT?",
          answer:
            "Yes — choose Encode a token from the ⋯ menu. It takes a header, payload and secret (or private key) and produces a signed token. Useful for testing your verifier against known-good inputs.",
        },
      ],
  relatedSlugs: ["base64", "json-formatter", "json-to-typescript", "regex-tester"],
} as const;

export function JwtDecoderContent() {
  return <ToolContent {...seoData} />;
}
