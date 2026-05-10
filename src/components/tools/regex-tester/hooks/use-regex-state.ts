// ─── Constants ────────────────────────────────────────────────────────────────

export const SAMPLE_TEXT = `Reach the team at hello@devtils.dev or support@devtils.dev.
Visit https://devtils.dev for the docs and https://example.com for tests.
Server is at 192.168.1.42, branding accent #D4FF4F. Released 2026-05-04.
// Add more text or paste your own…`;

export const FLAG_NAMES: Record<string, string> = {
  g: "global",
  i: "ignore case",
  m: "multiline",
  s: "dotall",
  u: "unicode",
  y: "sticky",
};

// ─── History persistence ─────────────────────────────────────────────────────

export interface HistoryEntry {
  pattern: string;
  flags: string;
  ts: number;
}

export const HISTORY_KEY = "regex-tester:history";
export const HISTORY_MAX = 12;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // localStorage may be disabled — fail silently
  }
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const TEXT_KEY = "regex-tester:text";
export const TEXT_SAVE_LIMIT = 200_000; // ~200KB — well within typical 5MB localStorage budget

export function loadSavedText(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TEXT_KEY);
  } catch {
    return null;
  }
}

export function saveText(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value.length > TEXT_SAVE_LIMIT) {
      // Don't try to persist huge pastes; clear any stale saved value.
      window.localStorage.removeItem(TEXT_KEY);
      return;
    }
    window.localStorage.setItem(TEXT_KEY, value);
  } catch {
    // localStorage may be disabled or full — fail silently
  }
}
