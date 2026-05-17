"use client";

import { useCallback, useRef } from "react";
import {
  CheckCircle2,
  Copy,
  Eraser,
  Link2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CardCaption, CardIconButton } from "../parts/Card";
import { JwtSegments } from "../parts/JwtSegments";
import type { JwtDecoderState } from "../useJwtDecoder";

export function InputPanel({ state }: { state: JwtDecoderState }) {
  const preRef = useRef<HTMLDivElement>(null);
  const { rawInput, parseError, jwt, verification } = state;

  const syncScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      const pre = preRef.current?.firstElementChild as HTMLElement | undefined;
      if (pre) {
        pre.scrollTop = e.currentTarget.scrollTop;
        pre.scrollLeft = e.currentTarget.scrollLeft;
      }
    },
    [],
  );

  const copyShare = () => {
    const url = state.shareLink();
    if (!url) return;
    void navigator.clipboard.writeText(url);
    toast.message("Share link copied", {
      description:
        "This link contains the full token. Only share it with people who should see it.",
    });
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <h3 className="text-sm font-semibold text-text">Encoded Token</h3>

      <div className="flex min-h-96 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-2.5">
          <CardCaption>JSON Web Token (JWT)</CardCaption>
          <div className="ml-auto flex items-center gap-1">
            <CardIconButton label="Load sample" onClick={state.loadSample}>
              <Sparkles size={13} />
            </CardIconButton>
            <CardIconButton
              label="Copy token"
              onClick={() => {
                if (!rawInput) return;
                void navigator.clipboard.writeText(rawInput);
                toast.success("Token copied");
              }}
            >
              <Copy size={13} />
            </CardIconButton>
            <CardIconButton label="Copy share link" onClick={copyShare}>
              <Link2 size={13} />
            </CardIconButton>
            <CardIconButton label="Clear" onClick={state.clear}>
              <Eraser size={13} />
            </CardIconButton>
          </div>
        </div>

        {/* Segment-colored editor — grows to fill the column height */}
        <div className="relative min-h-0 flex-1 bg-surface">
          <div ref={preRef} className="pointer-events-none absolute inset-0">
            <JwtSegments value={rawInput} />
          </div>
          <textarea
            value={rawInput}
            onChange={(e) => state.setRawInput(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            aria-label="JWT input"
            placeholder="Paste a JWT — header.payload.signature"
            className="code-overlay-textarea absolute inset-0 m-0 resize-none whitespace-pre-wrap break-all border-0 bg-transparent p-4 font-mono text-base leading-relaxed outline-none"
          />
        </div>

        {/* Status footer (inside the card) */}
        <div className="shrink-0 border-t border-border bg-bg px-4 py-2.5">
          <InputStatus
            parseError={parseError}
            hasJwt={Boolean(jwt)}
            verified={verification?.status === "valid"}
          />
        </div>
      </div>
    </div>
  );
}

function InputStatus({
  parseError,
  hasJwt,
  verified,
}: {
  parseError: JwtDecoderState["parseError"];
  hasJwt: boolean;
  verified: boolean;
}) {
  if (parseError) {
    return (
      <span
        className="inline-flex items-start gap-1.5 text-sm font-medium"
        style={{ color: "var(--color-danger)" }}
      >
        <XCircle size={13} aria-hidden className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold capitalize">
            {parseError.segment}
          </span>
          : {parseError.message}
        </span>
      </span>
    );
  }
  if (!hasJwt) {
    return <span className="text-sm text-text-faint">Awaiting a token…</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span
        className="inline-flex items-center gap-1.5 font-semibold"
        style={{ color: "var(--color-success)" }}
      >
        <CheckCircle2 size={13} aria-hidden />
        Valid JWT
      </span>
      {verified && (
        <span
          className="inline-flex items-center gap-1.5 font-semibold"
          style={{ color: "var(--color-success)" }}
        >
          <CheckCircle2 size={13} aria-hidden />
          Signature verified
        </span>
      )}
    </span>
  );
}
