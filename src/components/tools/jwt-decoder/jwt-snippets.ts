import { suggestedJwksUrl } from "./jwt-claims";
import type { ParsedJwt, SnippetLanguage } from "./jwt-decoder.types";

export const SNIPPET_LABELS: Record<SnippetLanguage, string> = {
  "node-jsonwebtoken": "Node · jsonwebtoken",
  "node-jose": "Node · jose",
  "python-pyjwt": "Python · PyJWT",
  "go-jwt": "Go · golang-jwt",
  "rust-jsonwebtoken": "Rust · jsonwebtoken",
};

export const SNIPPET_LANGUAGES: SnippetLanguage[] = [
  "node-jsonwebtoken",
  "node-jose",
  "python-pyjwt",
  "go-jwt",
  "rust-jsonwebtoken",
];

function jwksFor(jwt: ParsedJwt): string | null {
  const iss = jwt.payload.iss;
  return typeof iss === "string" ? suggestedJwksUrl(iss) : null;
}

export function generateSnippet(
  jwt: ParsedJwt,
  language: SnippetLanguage,
): string {
  const alg = jwt.header.alg;
  const isHmac = alg.startsWith("HS");
  const jwks = jwksFor(jwt);

  switch (language) {
    case "node-jsonwebtoken":
      return isHmac
        ? `import jwt from "jsonwebtoken";

const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ["${alg}"],
});
console.log(decoded);`
        : `import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "${jwks ?? "https://ISSUER/.well-known/jwks.json"}",
});

function getKey(header, cb) {
  client.getSigningKey(header.kid, (err, key) =>
    cb(err, key?.getPublicKey()),
  );
}

jwt.verify(token, getKey, { algorithms: ["${alg}"] }, (err, decoded) => {
  console.log(err ?? decoded);
});`;

    case "node-jose":
      return isHmac
        ? `import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const { payload } = await jwtVerify(token, secret, {
  algorithms: ["${alg}"],
});
console.log(payload);`
        : `import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("${jwks ?? "https://ISSUER/.well-known/jwks.json"}"),
);
const { payload } = await jwtVerify(token, JWKS, {
  algorithms: ["${alg}"],
});
console.log(payload);`;

    case "python-pyjwt":
      return isHmac
        ? `import jwt, os

decoded = jwt.decode(
    token,
    os.environ["JWT_SECRET"],
    algorithms=["${alg}"],
)
print(decoded)`
        : `import jwt
from jwt import PyJWKClient

jwks = PyJWKClient("${jwks ?? "https://ISSUER/.well-known/jwks.json"}")
signing_key = jwks.get_signing_key_from_jwt(token)

decoded = jwt.decode(
    token,
    signing_key.key,
    algorithms=["${alg}"],
)
print(decoded)`;

    case "go-jwt":
      return isHmac
        ? `import "github.com/golang-jwt/jwt/v5"

token, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) {
    return []byte(os.Getenv("JWT_SECRET")), nil
}, jwt.WithValidMethods([]string{"${alg}"}))
fmt.Println(token.Claims, err)`
        : `import (
    "github.com/golang-jwt/jwt/v5"
    "github.com/MicahParks/keyfunc/v3"
)

jwks, _ := keyfunc.NewDefault([]string{
    "${jwks ?? "https://ISSUER/.well-known/jwks.json"}",
})
token, err := jwt.Parse(raw, jwks.Keyfunc,
    jwt.WithValidMethods([]string{"${alg}"}))
fmt.Println(token.Claims, err)`;

    case "rust-jsonwebtoken":
      return isHmac
        ? `use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};

let validation = Validation::new(Algorithm::${alg});
let data = decode::<serde_json::Value>(
    &token,
    &DecodingKey::from_secret(secret.as_bytes()),
    &validation,
)?;
println!("{:?}", data.claims);`
        : `use jsonwebtoken::{decode, decode_header, DecodingKey, Validation, Algorithm};

// Fetch ${jwks ?? "https://ISSUER/.well-known/jwks.json"} and pick the JWK
// matching decode_header(&token)?.kid, then:
let validation = Validation::new(Algorithm::${alg});
let data = decode::<serde_json::Value>(
    &token,
    &DecodingKey::from_rsa_components(n, e)?,
    &validation,
)?;
println!("{:?}", data.claims);`;
  }
}
