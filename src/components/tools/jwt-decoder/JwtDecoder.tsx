"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import { cn } from "@/lib/cn";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useCallback } from "react";
import { toast } from "sonner";
import { JwtDecoderContent } from "./content";
import type { Mode } from "./jwt-decoder.types";
import { MobileAppBar } from "./mobile/mobile-app-bar";
import { EncodePanel } from "./panels/EncodePanel";
import { InputPanel } from "./panels/InputPanel";
import { OutputPanel } from "./panels/OutputPanel";
import { SnippetsPanel } from "./panels/SnippetsPanel";
import { VerificationCard } from "./panels/VerificationCard";
import { useJwtDecoder, type JwtDecoderState } from "./useJwtDecoder";
import { DiffView } from "./views/DiffView";

const MODES: { id: Mode; label: string }[] = [
  { id: "decode", label: "Decode" },
  { id: "encode", label: "Encode" },
  { id: "diff", label: "Diff" },
];

export function JwtDecoder({ tool }: { tool: Tool }) {
  const state = useJwtDecoder();
  const { jwt } = state;
  const isMobile = useIsMobile();
  const mobileStatus = getMobileStatus(state);

  const copyJson = useCallback((obj: unknown, label: string) => {
    void navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    toast.success(`${label} copied as JSON`);
  }, []);

  useShortcut({ key: "Enter", meta: true }, (e) => {
    e.preventDefault();
    state.forceDecode();
  });
  useShortcut({ key: "v", meta: true, shift: true }, (e) => {
    e.preventDefault();
    void state.runVerify();
  });
  useShortcut({ key: "c", meta: true, shift: true }, (e) => {
    e.preventDefault();
    if (jwt) copyJson(jwt.payload, "Payload");
  });
  useShortcut({ key: "h", meta: true, shift: true }, (e) => {
    e.preventDefault();
    if (jwt) copyJson(jwt.header, "Header");
  });
  useShortcut({ key: "e", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.setMode("encode");
  });
  useShortcut({ key: "d", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.setMode("diff");
  });
  useShortcut({ key: "l", meta: true, shift: true }, (e) => {
    e.preventDefault();
    state.loadSample();
  });

  return (
    <ToolShell
      tool={tool}
      classNames={{
        header: "hidden md:block",
        body: "max-md:!p-0 max-md:!max-w-none",
      }}
    >
      {isMobile && (
        <MobileAppBar
          title={tool.name}
          tier={tool.tier}
          status={mobileStatus}
        />
      )}
      <div className={cn("flex flex-col gap-3", isMobile && "px-4 py-4")}>
        {/* Mode tabs */}
        <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-border bg-surface p-1 mx-auto lg:mx-0">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => state.setMode(m.id)}
              className={cn(
                "h-8 cursor-pointer rounded-lg px-4 text-sm font-medium transition-colors",
                state.mode === m.id
                  ? "bg-brand text-text-on-sage"
                  : "text-text-faint hover:bg-surface-soft hover:text-text"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Workspace — grows with content; the page scrolls, not an inner
            box. Only the signature segment has its own scroll. */}
        <div style={{ minHeight: "32rem" }}>
          {state.mode === "decode" && (
            <div className="flex flex-col gap-4">
              {/* Top row: token (left) ‖ header + payload (right) */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                <div className="lg:flex-1 lg:basis-0">
                  <InputPanel state={state} />
                </div>
                <div className="lg:flex-1 lg:basis-0">
                  <OutputPanel state={state} />
                </div>
              </div>

              {/* Full-width stages below */}
              <VerificationCard state={state} />
              {state.jwt && <SnippetsPanel jwt={state.jwt} />}
            </div>
          )}

          {state.mode === "encode" && (
            <div className="rounded-xl border border-border bg-surface">
              <EncodePanel state={state} />
            </div>
          )}

          {state.mode === "diff" && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <DiffView
                a={state.diffA}
                b={state.diffB}
                onA={state.setDiffA}
                onB={state.setDiffB}
              />
            </div>
          )}
        </div>
        <JwtDecoderContent />
      </div>
    </ToolShell>
  );
}

function getMobileStatus(
  state: JwtDecoderState
): { text: string; tone: "valid" | "invalid" | "muted" } | null {
  if (state.parseError) return { text: "Invalid token", tone: "invalid" };
  if (!state.jwt) return null;
  if (state.verification?.status === "valid") {
    return { text: "Valid · signature verified", tone: "valid" };
  }
  return { text: "Valid JWT", tone: "valid" };
}
