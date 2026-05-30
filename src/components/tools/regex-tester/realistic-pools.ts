// Pure data — no React, no regex logic.

export const FIRST_NAMES = [
  "maria", "alex", "david", "emma", "james", "sarah", "michael",
  "priya", "carlos", "yuki", "andre", "fatima", "noah", "elena",
  "marcus", "wei", "sofia", "lena", "tom", "nadia",
];

export const LAST_NAMES = [
  "smith", "chen", "johnson", "garcia", "kim", "patel", "wang",
  "nguyen", "silva", "anderson", "taylor", "tanaka", "brown",
  "davis", "martinez", "wilson", "thompson", "nakamura", "ali", "russo",
];

export const EMAIL_PROVIDERS = [
  "gmail", "yahoo", "outlook", "icloud", "proton",
  "anthropic", "github", "stripe", "vercel", "linear",
];

export const EMAIL_TLDS = ["com", "io", "dev", "org", "net", "co", "ai", "app"];

export const EMAIL_SUFFIXES = ["newsletter", "work", "dev", "lists", "noreply"];

export const URL_SCHEMES = ["https", "http"];

export const URL_HOSTS = [
  "utilyx.dev", "github.com", "api.stripe.com", "docs.anthropic.com",
  "linear.app", "vercel.com", "nextjs.org", "tailwindcss.com",
  "npm.registry.dev", "example.com", "sub.example.org",
];

export const URL_PATHS = [
  "/", "/docs", "/api/v1/users", "/blog/intro-to-regex",
  "/dashboard?tab=settings", "/releases/tag/v2.0.0", "/search?q=regex+tester",
  "/pricing#enterprise", "/download/latest",
];

export const IPV4_ADDRESSES = [
  "192.168.1.1", "192.168.0.100", "10.0.0.1", "172.16.0.5",
  "127.0.0.1", "8.8.8.8", "1.1.1.1", "0.0.0.0", "255.255.255.255",
  "203.0.113.42", "198.51.100.7", "100.64.0.1",
];

export const UUIDS = [
  "550e8400-e29b-41d4-a716-446655440000",
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "00000000-0000-4000-8000-000000000000",
  "ffffffff-ffff-4fff-bfff-ffffffffffff",
  "a1b2c3d4-e5f6-4789-8012-abcdef012345",
  "123e4567-e89b-12d3-a456-426614174000",
];

export const HEX_COLORS = [
  "#FF6B35", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#1A1A2E", "#16213E", "#0F3460", "#E94560", "#533483",
  "#D4FF4F", "#2ECC71", "#E74C3C", "#3498DB", "#F39C12",
  "#FFF", "#000", "#ABC", "#F0F0F0",
];

export const ISO_DATES = [
  "2024-01-15", "2025-12-31", "2023-06-01", "2026-05-09",
  "1999-12-31", "2000-01-01", "2020-02-29", "2024-11-28",
  "2025-03-14", "2026-07-04",
];

export const ISO_TIMES = [
  "09:30", "17:00", "00:00", "23:59", "12:00",
  "08:15", "14:45", "21:30", "03:07", "11:11",
];

export const PHONE_NUMBERS = [
  "+1 (555) 234-5678", "+44 20 7946 0958", "+33 1 42 34 56 78",
  "+49 30 12345678", "+81 3-1234-5678", "+91 98765 43210",
  "555-867-5309", "(800) 555-1234", "+1-800-555-0199",
  "020 7946 0958",
];

export const SLUGS = [
  "hello-world", "getting-started-with-regex",
  "top-10-developer-tools-2025", "how-to-use-lookaheads",
  "intro-to-typescript", "vercel-vs-netlify",
  "open-source-contributions", "api-design-patterns",
  "machine-learning-basics", "css-grid-guide",
];

export const PRICES = [
  "$9.99", "$29.00", "$149.99", "$0.49", "$1,299.00",
  "$4.20", "$99.95", "$12.50", "$0.01", "$999.99",
  "€19.99", "£24.95",
];

export const IPV6_ADDRESSES = [
  "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  "fe80::1ff:fe23:4567:890a",
  "::1",
  "2001:db8::ff00:42:8329",
  "2607:f8b0:4004:0c08::6a",
  "::ffff:192.0.2.1",
];

export const SEMVERS = [
  "1.0.0", "2.3.1", "0.0.1", "10.0.0-alpha",
  "3.14.159", "v1.2.3", "2.0.0-beta.1", "1.0.0+build.123",
  "0.1.0-rc.2", "5.0.0-preview.1",
];

export const MAC_ADDRESSES = [
  "00:1A:2B:3C:4D:5E", "AA:BB:CC:DD:EE:FF",
  "08:00:27:1a:b4:c3", "52:54:00:12:34:56",
  "dc:a6:32:00:11:22", "b8:27:eb:ab:cd:ef",
];

export const JWT_EXAMPLES = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJleGFtcGxlLmNvbSIsInN1YiI6InVzZXIxMjMifQ.abc123",
];

export const HEX_STRINGS = [
  "48656c6c6f", "deadbeef", "cafebabe", "0123456789abcdef",
  "ff00ff", "a1b2c3", "DEADBEEF", "CAFEBABE",
];

export const BASE64_STRINGS = [
  "SGVsbG8gV29ybGQ=", "dGVzdA==", "Zm9vYmFy",
  "YWJjMTIz", "dXNlcjpwYXNzd29yZA==",
];

// Char pools for generic fallback — weighted toward readable output
export const VOWELS = "aeiouu";
export const CONSONANTS = "bcdfghjklmnprstw";
export const DIGITS = "0123456789";
export const WORD_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_";
export const PRINTABLE = "abcdefghijklmnopqrstuvwxyz0123456789 .,!?-_@#";

// Common English words — feed these through any regex first to find real matches
export const COMMON_WORDS = [
  "hello", "world", "test", "data", "user", "admin", "guest",
  "regex", "pattern", "match", "search", "filter", "query",
  "input", "output", "value", "field", "label", "title",
  "name", "email", "phone", "address", "city", "country",
  "company", "team", "project", "task", "issue", "feature",
  "code", "build", "deploy", "release", "version", "branch",
  "file", "folder", "image", "video", "document", "report",
  "click", "submit", "cancel", "save", "delete", "edit",
  "open", "close", "start", "stop", "pause", "resume",
  "blue", "green", "red", "black", "white", "yellow",
  "fast", "slow", "happy", "quiet", "bright", "calm",
  "today", "tomorrow", "yesterday", "morning", "evening",
];

export const COMMON_PHRASES = [
  "The quick brown fox jumps over the lazy dog",
  "Hello, world!",
  "Lorem ipsum dolor sit amet",
  "The rain in Spain falls mainly on the plain",
  "All work and no play",
  "A journey of a thousand miles",
  "To be or not to be",
  "May the force be with you",
  "I think therefore I am",
  "Knowledge is power",
];

// Mixed real-world strings to try as candidates for any regex
export const MIXED_STRINGS = [
  // Words
  "hello", "world", "regex", "pattern", "data", "test", "code",
  // Capitalized
  "Hello", "World", "Regex", "Pattern", "Data", "Test", "Code",
  // ALLCAPS
  "TODO", "FIXME", "WARNING", "ERROR", "INFO", "DEBUG",
  // Numbers
  "42", "100", "1234", "9999", "0", "1", "365",
  // Decimals
  "3.14", "2.718", "1.0", "99.99", "0.5",
  // Negative numbers
  "-1", "-42", "-3.14",
  // Mixed alphanumeric
  "abc123", "user42", "test01", "v1", "id_123", "item-7",
  // Hyphenated
  "first-name", "blog-post", "kebab-case",
  // Underscored
  "snake_case", "user_id", "first_name",
  // CamelCase
  "camelCase", "firstName", "userId",
  // PascalCase
  "PascalCase", "UserProfile", "RegexTester",
  // Emails
  "user@example.com", "hello@test.org", "admin@site.io",
  // URLs
  "https://example.com", "http://test.dev/path",
  "https://github.com/user/repo",
  // IPs
  "192.168.1.1", "10.0.0.1", "127.0.0.1",
  // Dates
  "2025-01-15", "2024-12-31", "2026-05-09",
  "01/15/2025", "31/12/2024",
  // Times
  "09:30", "14:45", "23:59",
  // Phones
  "555-1234", "(555) 123-4567", "+1-555-867-5309",
  // Versions
  "v1.0.0", "2.3.1", "v0.9.0-beta",
  // Hex
  "#ff0000", "#00ff00", "0xDEADBEEF", "0xCAFE",
  // Sentences
  "Hello, world!", "The quick brown fox.", "It works!",
  // Whitespace samples
  "  spaced  ", "\ttab", "line\nbreak",
  // Empty/edge
  "",
  // Punctuation-heavy
  "...", "!!!", "???", ":-)",
  // Quotes
  '"quoted"', "'single'",
  // Tags
  "<div>", "</div>", "<br/>",
  // Slug
  "hello-world", "blog-post-2025",
];
