"use client";

import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Card, CardCaption, CardIconButton } from "../parts/Card";
import type { Algorithm } from "../jwt-decoder.types";
import type { JwtDecoderState } from "../useJwtDecoder";

const ALGS: Algorithm[] = [
  "HS256", "HS384", "HS512",
  "RS256", "RS384", "RS512",
  "ES256", "ES384", "ES512",
  "PS256", "PS384", "PS512",
  "none",
];

export function EncodePanel({ state }: { state: JwtDecoderState }) {
  const isHmac = state.encAlg.startsWith("HS");
  const isNone = state.encAlg === "none";

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Header">
          <AutoGrowTextarea
            value={state.encHeader}
            onChange={state.setEncHeader}
            ariaLabel="JWT header JSON"
          />
        </Field>
        <Field label="Payload">
          <AutoGrowTextarea
            value={state.encPayload}
            onChange={state.setEncPayload}
            ariaLabel="JWT payload JSON"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold uppercase tracking-tag text-text-faint">
            Algorithm
          </span>
          <Select
            value={state.encAlg}
            onValueChange={(v) => state.setEncAlg(v as Algorithm)}
          >
            <SelectTrigger size="sm" className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALGS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void state.runEncode()}
        >
          <KeyRound size={14} aria-hidden />
          Generate JWT
        </Button>
      </div>

      {!isNone && (
        <Field label={isHmac ? "Secret" : "Private key (PEM, PKCS#8)"}>
          <textarea
            value={state.encKey}
            onChange={(e) => state.setEncKey(e.target.value)}
            spellCheck={false}
            aria-label="Signing key"
            placeholder={
              isHmac ? "your-256-bit-secret" : "-----BEGIN PRIVATE KEY-----"
            }
            className="h-20 w-full resize-none rounded-lg border border-border bg-bg p-2.5 font-mono text-base text-text outline-none"
          />
        </Field>
      )}

      {state.encodeError && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {state.encodeError}
        </p>
      )}

      {state.encoded && (
        <Card
          left={<CardCaption>Signed JWT</CardCaption>}
          actions={
            <CardIconButton
              label="Copy generated JWT"
              onClick={() => {
                void navigator.clipboard.writeText(state.encoded);
                toast.success("JWT copied");
              }}
            >
              <Copy size={13} />
            </CardIconButton>
          }
        >
          <div className="whitespace-pre-wrap break-all rounded-lg border border-border bg-bg p-3 font-mono text-base leading-relaxed text-text">
            {state.encoded}
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Textarea that grows with its content (no JS, no fixed height): a hidden
 * mirror `<div>` with the same box model sizes the grid row; the textarea
 * is stacked in the same cell and stretches to fill. `min-h-32` is the
 * floor so an empty editor still has a comfortable size.
 */
function AutoGrowTextarea({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const shared =
    "col-start-1 row-start-1 min-h-32 w-full whitespace-pre-wrap break-words rounded-lg border border-border p-2.5 font-mono text-base leading-relaxed";
  return (
    <div className="grid h-full">
      {/* Mirror sizes the grid row to this editor's own content. */}
      <div aria-hidden className={`${shared} invisible`}>
        {value}
        {"\n"}
      </div>
      {/* `min-h-full` makes the shorter editor stretch to the taller
          sibling's height (the outer 2-col grid stretches both cells). */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label={ariaLabel}
        className={`${shared} min-h-full resize-none overflow-hidden bg-bg text-text outline-none`}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-1.5">
      <span className="text-sm font-semibold uppercase tracking-tag text-text-faint">
        {label}
      </span>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
