/**
 * JSON samples shared across the JSON → X converter tools. Each is chosen
 * to exercise the emitters' interesting paths: optional fields, nested
 * objects, arrays of records, string format hints, nullable values, mixed
 * types. Picking a representative sample matters because the *first* thing
 * a visitor does on a converter tool is click "load sample" — if the result
 * looks trivial they bounce. A few of these are deliberately spicy.
 */

export interface JsonSample {
  id: string;
  label: string;
  description: string;
  value: unknown;
}

export const JSON_SAMPLES: JsonSample[] = [
  {
    id: "user",
    label: "User profile",
    description: "Nested user record with address + tags + nullable bio.",
    value: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ada Lovelace",
      email: "ada@example.com",
      age: 36,
      bio: null,
      address: {
        street: "21 Dorset Street",
        city: "London",
        country: "UK",
        postalCode: "W1U 7AA",
      },
      tags: ["mathematician", "writer", "engineer"],
      createdAt: "2024-01-15T09:00:00Z",
      verified: true,
    },
  },
  {
    id: "api-response",
    label: "API response",
    description: "Paginated list response with meta envelope.",
    value: {
      data: [
        { id: 1, sku: "WIDGET-001", price: 19.99, inStock: true },
        { id: 2, sku: "GADGET-002", price: 49.5, inStock: false },
        { id: 3, sku: "GIZMO-003", price: 14.0, inStock: true },
      ],
      meta: {
        page: 1,
        perPage: 10,
        total: 137,
        hasMore: true,
      },
      links: {
        self: "https://api.example.com/products?page=1",
        next: "https://api.example.com/products?page=2",
      },
    },
  },
  {
    id: "users-array",
    label: "Users array",
    description: "Heterogeneous array — exercises optional + nullable inference.",
    value: [
      { id: 1, name: "Alice", role: "admin", lastLogin: "2024-12-01T10:00:00Z" },
      { id: 2, name: "Bob", role: "user", lastLogin: null },
      { id: 3, name: "Carol", role: "user" },
    ],
  },
  {
    id: "config",
    label: "Config file",
    description: "Nested config with arrays, booleans, and deep paths.",
    value: {
      server: {
        host: "0.0.0.0",
        port: 3000,
        tls: { enabled: true, certPath: "/etc/ssl/cert.pem" },
      },
      database: {
        host: "db.internal",
        port: 5432,
        pool: { min: 2, max: 10 },
      },
      features: ["auth", "billing", "analytics"],
      debug: false,
    },
  },
  {
    id: "tweet",
    label: "Tweet-shaped object",
    description: "Twitter-style record with deeply nested entities.",
    value: {
      id: "1735000000000000000",
      text: "Hello from the JSON converter!",
      author: {
        id: "u_12345",
        handle: "@ada",
        verified: true,
      },
      entities: {
        hashtags: ["#json", "#types"],
        mentions: [{ handle: "@example", offset: 17 }],
        urls: [],
      },
      createdAt: "2025-01-15T14:30:00Z",
      retweetCount: 42,
      likeCount: 137,
      replyTo: null,
    },
  },
];

export function getSampleById(id: string): JsonSample | undefined {
  return JSON_SAMPLES.find((s) => s.id === id);
}
