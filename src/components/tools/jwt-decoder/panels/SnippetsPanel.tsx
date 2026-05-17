"use client";

import { Section } from "../parts/Card";
import { SnippetsView } from "../views/SnippetsView";
import type { ParsedJwt } from "../jwt-decoder.types";

/** Full-width, collapsed-by-default code snippets stage. */
export function SnippetsPanel({ jwt }: { jwt: ParsedJwt }) {
  return (
    <Section title="Verify in your language">
      <details className="rounded-xl border border-border bg-surface [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-text-muted">
          Show code snippets for {jwt.header.alg}
        </summary>
        <div className="border-t border-border-subtle p-4">
          <SnippetsView jwt={jwt} />
        </div>
      </details>
    </Section>
  );
}
