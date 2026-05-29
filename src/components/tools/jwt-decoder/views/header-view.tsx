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
import type { ParsedJwt } from "../jwt-decoder.types";

type View = "json" | "claims";

export function HeaderView({ jwt }: { jwt: ParsedJwt }) {
  const [view, setView] = useState<View>("json");
  const json = useMemo(
    () => JSON.stringify(jwt.header, null, 2),
    [jwt.header],
  );
  const html = useMemo(() => highlightJson(json), [json]);
  const keys = Object.keys(jwt.header);

  return (
    <Section title="Decoded Header">
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
            label="Copy header JSON"
            onClick={() => {
              void navigator.clipboard.writeText(json);
              toast.success("Header copied");
            }}
          >
            <Copy size={13} />
          </CardIconButton>
        }
      >
        {view === "json" ? (
          <pre className="whitespace-pre-wrap break-all rounded-lg border border-border bg-bg p-3 font-mono text-base leading-relaxed text-text">
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        ) : (
          <div>
            {keys.map((k) => (
              <ClaimRow key={k} claimKey={k} value={jwt.header[k]} />
            ))}
          </div>
        )}
      </Card>
    </Section>
  );
}
