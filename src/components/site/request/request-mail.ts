/**
 * Pure helpers for the /request form: validation and the prefilled
 * `mailto:` link. No React, no DOM — the form component owns state.
 */

export interface RequestDraft {
  name: string;
  what: string;
  category: string;
  email: string;
}

export type RequestErrors = Partial<Record<"name" | "what" | "email", string>>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateRequest(d: RequestDraft): RequestErrors {
  const errors: RequestErrors = {};
  if (!d.name.trim()) errors.name = "Give the tool a name.";
  if (d.what.trim().length < 10) errors.what = "Describe what it should do in a sentence or two.";
  if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) errors.email = "That email doesn't look right.";
  return errors;
}

/** Some mail clients and browsers drop very long mailto URLs. */
const MAX_URL = 1800;
const TRIM_MARK = "\n[…shortened to fit in an email link]";

function bodyFor(d: RequestDraft, what: string, pageUrl: string): string {
  return [
    `Tool name: ${d.name.trim()}`,
    `Category: ${d.category}`,
    "",
    "What it should do:",
    what,
    "",
    `Email for updates: ${d.email.trim() || "(not given)"}`,
    "",
    `Sent from ${pageUrl}`,
  ].join("\n");
}

export interface RequestMail {
  href: string;
  /** Full plain-text request, never shortened — for copy-to-clipboard. */
  text: string;
  /** True when the description was cut to keep the link short. */
  trimmed: boolean;
}

export function buildRequestMail(d: RequestDraft, to: string, pageUrl: string): RequestMail {
  const name = d.name.trim().slice(0, 80);
  const subject = `Tool request: ${name}`;
  const full = d.what.trim();
  const make = (what: string) =>
    `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyFor(d, what, pageUrl))}`;

  let href = make(full);
  let trimmed = false;
  if (href.length > MAX_URL) {
    trimmed = true;
    // Binary-search the longest prefix of the description that still fits.
    let lo = 0;
    let hi = full.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (make(full.slice(0, mid) + TRIM_MARK).length <= MAX_URL) lo = mid;
      else hi = mid - 1;
    }
    href = make(full.slice(0, lo) + TRIM_MARK);
  }
  return { href, text: `${subject}\n\n${bodyFor(d, full, pageUrl)}`, trimmed };
}
