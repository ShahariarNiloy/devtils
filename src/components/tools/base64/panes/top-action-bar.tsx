"use client";

import React, { useRef } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Copy,
  Download,
  Image as ImageIcon,
  Key,
  Link2,
  Lock,
  ScanLine,
  Shield,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Tooltip } from "@/components/primitives/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { CharsetSelector } from "../components/charset-selector";
import { DirectionToggle } from "../components/direction-toggle";
import { VariantSelector } from "../components/variant-selector";
import { RoundTripBadge } from "../components/round-trip-badge";
import { PRESETS } from "../base64.lib";
import type {
  Charset,
  Direction,
  PresetItem,
  Base64Variant,
} from "../base64.types";

const PRESET_ICON: Record<string, LucideIcon> = {
  lock: Lock,
  key: Key,
  image: ImageIcon,
  shield: Shield,
};

const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer";

interface TopActionBarProps {
  direction: Direction;
  setDirection: (d: Direction) => void;
  variant: Base64Variant;
  setVariant: (v: Base64Variant) => void;
  charset: Charset;
  setCharset: (c: Charset) => void;
  isProcessing: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onShare: () => void;
  onSwap: () => void;
  onStripWhitespace: () => void;
  onPreset: (p: PresetItem) => void;
  onLoadFile: (file: File) => void;
  roundTripOk: boolean | null;
  showRoundTrip: boolean;
}

export function TopActionBar({
  direction,
  setDirection,
  variant,
  setVariant,
  charset,
  setCharset,
  isProcessing,
  onCopy,
  onDownload,
  onShare,
  onSwap,
  onStripWhitespace,
  onPreset,
  onLoadFile,
  roundTripOk,
  showRoundTrip,
}: TopActionBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
      e.target.value = "";
    }
  };

  return (
    <div className="flex h-12 items-center gap-2 px-2 overflow-x-auto">
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />

      <DirectionToggle value={direction} onChange={setDirection} />
      <div className="h-5 w-px bg-border shrink-0" aria-hidden />
      <VariantSelector value={variant} onChange={setVariant} />
      <div className="h-5 w-px bg-border shrink-0" aria-hidden />
      <CharsetSelector value={charset} onChange={setCharset} />

      {isProcessing && (
        <span
          className="text-sm font-mono text-text-faint shrink-0"
          aria-live="polite"
        >
          processing…
        </span>
      )}

      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        {showRoundTrip && (
          <div className="mr-1.5">
            <RoundTripBadge ok={roundTripOk} />
          </div>
        )}

        <Tooltip content="Upload a file" side="bottom">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Upload a file"
            className={ICON_BTN}
          >
            <Upload size={16} aria-hidden />
          </button>
        </Tooltip>

        <DropdownMenu>
          <Tooltip content="Try an example" side="bottom">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Try an example"
                className={ICON_BTN}
              >
                <BookOpen size={16} aria-hidden />
              </button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent side="bottom" align="end" className="w-48">
            {PRESETS.map((preset) => {
              const Icon = PRESET_ICON[preset.icon] ?? Lock;
              return (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => onPreset(preset)}
                >
                  <Icon size={13} aria-hidden />
                  {preset.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border-subtle mx-1" aria-hidden />

        <Tooltip content="Strip whitespace" side="bottom">
          <button
            type="button"
            onClick={onStripWhitespace}
            aria-label="Strip whitespace"
            className={ICON_BTN}
          >
            <ScanLine size={16} aria-hidden />
          </button>
        </Tooltip>

        <Tooltip content="Swap input / output" side="bottom">
          <button
            type="button"
            onClick={onSwap}
            aria-label="Swap input and output"
            className={ICON_BTN}
          >
            <ArrowLeftRight size={16} aria-hidden />
          </button>
        </Tooltip>

        <Tooltip content="Copy result" side="bottom">
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy result"
            className={ICON_BTN}
          >
            <Copy size={16} aria-hidden />
          </button>
        </Tooltip>

        <Tooltip content="Download" side="bottom">
          <button
            type="button"
            onClick={onDownload}
            aria-label="Download"
            className={ICON_BTN}
          >
            <Download size={16} aria-hidden />
          </button>
        </Tooltip>

        <Tooltip content="Copy share link" side="bottom">
          <button
            type="button"
            onClick={onShare}
            aria-label="Copy share link"
            className={ICON_BTN}
          >
            <Link2 size={16} aria-hidden />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
