import { ToolContent } from "@/components/shared/tool-content";

export function JwtDecoderContent() {
  return (
    <ToolContent
      intro="Paste any JSON Web Token and instantly see its header, payload, and signature, with all standard claims (iss, sub, aud, exp, iat, nbf) decoded and interpreted in human-readable form. HMAC-SHA256 signatures can be verified against a shared secret directly in the browser — no token contents ever leave your device."
      useCases={[
        {
          title: "Debugging auth flows",
          description:
            "Decode the token your auth provider hands back to your app to verify the claims match what you expect — roles, scopes, expiry. Catches misconfigured issuers and wrong audience values quickly.",
        },
        {
          title: "Checking token expiry mid-incident",
          description:
            "Paste a token from production logs to confirm whether `exp` has passed. The decoded view shows the absolute timestamp and relative time-to-expiry.",
        },
        {
          title: "Verifying HS256 signatures",
          description:
            "When you have access to the signing secret, paste both and confirm the token's signature is valid. Useful for diagnosing signature drift between issuer and verifier.",
        },
        {
          title: "Learning JWT structure",
          description:
            "Hover over each claim in the decoded view to see what it means. Useful for understanding what your auth provider is actually putting in the token.",
        },
      ]}
      faqs={[
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
            "Currently only HS256 (symmetric / shared secret) verification is supported. RS256 / ES256 use asymmetric key pairs and require fetching the issuer's public key from a JWKS endpoint — that's planned but not shipped yet.",
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
            "Yes — the Encode panel takes a header + payload + secret and produces a signed token. Useful for testing your verifier against known-good inputs.",
        },
      ]}
      relatedSlugs={["base64", "json-formatter", "json-to-typescript", "regex-tester"]}
    />
  );
}
