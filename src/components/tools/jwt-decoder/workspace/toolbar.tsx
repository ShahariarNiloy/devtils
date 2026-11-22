"use client";

import { Copy, GitCompare, Link2, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { SAMPLE_IDS, SAMPLE_LABELS } from "../jwt-samples";
import type { JwtDecoderState } from "../useJwtDecoder";
import { Segmented } from "./ui";

const MODES = [
  { value: "decode", label: "Decode & verify" },
  { value: "encode", label: "Edit & sign" },
] as const;

function copy(text: string, what: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(`${what} copied`),
    () => toast.error("Couldn't reach the clipboard"),
  );
}

/** Mode tabs · "Try" example chips · trust line · overflow menu. */
export function Toolbar({ state }: { state: JwtDecoderState }) {
  const { jwt, decoded, token } = state;
  const empty = !token.trim();
  const tabMode = state.mode === "encode" ? "encode" : "decode";

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-border-subtle bg-toolbar px-3.5 py-3">
      <Segmented
        tabs
        label="Mode"
        options={MODES}
        value={tabMode}
        onChange={(m) => state.setMode(m)}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-text-faint">Try</span>
        {SAMPLE_IDS.map((id) => {
          const on = state.activeSample === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => state.pickSample(id)}
              className={cn(
                "min-h-[30px] cursor-pointer rounded-full border px-[11px] font-mono text-xs transition-colors max-md:min-h-11",
                on ? "border-brand bg-brand text-on-brand" : "border-white/12 bg-transparent text-text-muted hover:border-clay-light/60 hover:text-text",
              )}
            >
              {SAMPLE_LABELS[id]}
            </button>
          );
        })}
      </div>
      <span className="grow" />
      <span className="hidden text-xs text-text-faint md:inline">Decoded and verified in this tab</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-white/6 hover:text-text max-md:size-11"
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <MenuRow icon={<Copy size={14} />} label="Copy token" disabled={empty} onSelect={() => copy(token.trim(), "Token")} />
          <MenuRow
            icon={<Copy size={14} />}
            label="Copy header JSON"
            hint="⌘⇧H"
            disabled={!decoded}
            onSelect={() => decoded && copy(decoded.headerPretty, "Header JSON")}
          />
          <MenuRow
            icon={<Copy size={14} />}
            label="Copy payload JSON"
            hint="⌘⇧C"
            disabled={!jwt || !decoded}
            onSelect={() => decoded && copy(decoded.payloadPretty, "Payload JSON")}
          />
          <MenuRow
            icon={<Link2 size={14} />}
            label="Copy share link"
            disabled={empty}
            onSelect={() => {
              void navigator.clipboard.writeText(state.shareLink()).then(() =>
                toast.message("Share link copied", {
                  description: "The token rides in the #hash, so it never reaches a server, but anyone with the link can read it.",
                }),
              );
            }}
          />
          <DropdownMenuSeparator />
          <MenuRow icon={<GitCompare size={14} />} label="Compare two tokens" hint="⌘⇧D" onSelect={() => state.setMode("diff")} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MenuRow({ icon, label, hint, onSelect, disabled }: { icon: ReactNode; label: string; hint?: string; onSelect: () => void; disabled?: boolean }) {
  return (
    <DropdownMenuItem onSelect={onSelect} disabled={disabled} className="flex items-center gap-2.5">
      <span aria-hidden="true" className="text-text-faint">
        {icon}
      </span>
      <span className="grow">{label}</span>
      {hint && <span className="font-mono text-[11px] text-text-faint">{hint}</span>}
    </DropdownMenuItem>
  );
}
