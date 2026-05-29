"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { highlightJson } from "@/components/tools/json-formatter/json-highlighter";
import {
  Card,
  CardIconButton,
  Section,
  SegmentToggle,
} from "../parts/card";
import { ClaimRow } from "../parts/claim-row";
import { ExpirationBadge } from "../parts/expiration-badge";
import { SecurityWarnings } from "../parts/security-warnings";
import {
  formatAbsoluteTime,
  formatRelativeTime,
} from "../jwt-decoder.lib";
import type { ParsedJwt, SecurityWarning } from "../jwt-decoder.types";

type View = "json" | "claims";

const DATE_CLAIMS = ["exp", "iat", "nbf"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Append an inline, greyed humanized-time note after the numeric value of
 * date claims (exp / iat / nbf) in the already-highlighted JSON HTML — the
 * jwt.io "// in 22 hours" annotation, without losing syntax colour.
 */
function annotateDates(html: string): string {
  let out = html;
  for (const k of DATE_CLAIMS) {
    const re = new RegExp(
      `(<span class="tok-key">"${k}"</span><span class="tok-punct">:</span>\\s*<span class="tok-number">)(-?\\d+)(</span>)`,
      "g",
    );
    out = out.replace(re, (_m, pre: string, num: string, post: string) => {
      const n = Number(num);
      if (!Number.isFinite(n)) return `${pre}${num}${post}`;
      const note = `  // ${formatAbsoluteTime(n)} (${formatRelativeTime(n)})`;
      return `${pre}${num}${post}<span style="color:var(--color-text-faint)">${esc(note)}</span>`;
    });
  }
  return out;
}

export function PayloadView({
  jwt,
  warnings,
}: {
  jwt: ParsedJwt;
  warnings: SecurityWarning[];
}) {
  const [view, setView] = useState<View>("json");
  const json = useMemo(
    () => JSON.stringify(jwt.payload, null, 2),
    [jwt.payload],
  );
  const html = useMemo(() => annotateDates(highlightJson(json)), [json]);
  const keys = Object.keys(jwt.payload);

  return (
    <Section
      title="Decoded Payload"
      aside={<ExpirationBadge jwt={jwt} />}
      status={
        warnings.length > 0 ? (
          <SecurityWarnings warnings={warnings} />
        ) : undefined
      }
    >
      <Card
        left={
          <SegmentToggle
            value={view}
            onChange={setView}
            options={[
              { id: "json", label: "JSON" },
              { id: "claims", label: "Claims breakdown" },
            ]}
          />
        }
        actions={
          <CardIconButton
            label="Copy payload JSON"
            onClick={() => {
              void navigator.clipboard.writeText(json);
              toast.success("Payload copied");
            }}
          >
            <Copy size={13} />
          </CardIconButton>
        }
      >
        <PayloadBody view={view} html={html} keys={keys} jwt={jwt} />
      </Card>
    </Section>
  );
}

function PayloadBody({
  view,
  html,
  keys,
  jwt,
}: {
  view: View;
  html: string;
  keys: string[];
  jwt: ParsedJwt;
}) {
  if (view === "json") {
    return (
      <pre className="whitespace-pre-wrap break-all rounded-lg border border-border bg-bg p-3 font-mono text-base leading-relaxed text-text">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    );
  }
  if (keys.length === 0) {
    return <p className="text-sm text-text-faint">No claims in this payload.</p>;
  }
  return (
    <div>
      {keys.map((k) => (
        <ClaimRow key={k} claimKey={k} value={jwt.payload[k]} />
      ))}
    </div>
  );
}
