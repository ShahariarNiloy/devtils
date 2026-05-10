"use client";

import {
  ArrowLeftRight, Copy, Download,
  Image as ImageIcon, Key, Link2, Lock,
  ScanLine, Shield, Upload, BookOpen,
  type LucideIcon,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from '@/components/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { PRESETS } from "../base64.lib";
import { RoundTripBadge } from '../components/round-trip-badge';
import type { PresetItem } from "../base64.types";

const BTN = "w-full justify-start gap-2 h-9 text-sm";

const S_UPLOAD: React.CSSProperties = {
  background: "var(--btn-upload-bg)",
  color: "var(--btn-upload-text)",
  borderColor: "var(--btn-upload-border)",
};
const S_GHOST: React.CSSProperties = {
  background: "var(--btn-ghost-bg)",
  color: "var(--btn-ghost-text)",
  borderColor: "var(--btn-ghost-border)",
};

const PRESET_ICON: Record<string, LucideIcon> = {
  lock: Lock, key: Key, image: ImageIcon, shield: Shield,
};

interface ActionColumnProps {
  onSwap: () => void;
  onStripWhitespace: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onShare: () => void;
  onPreset: (p: PresetItem) => void;
  onLoadFile: (file: File) => void;
  roundTripOk: boolean | null;
  showRoundTrip: boolean;
}

export function ActionColumn({
  onSwap, onStripWhitespace,
  onCopy, onDownload, onShare,
  onPreset, onLoadFile, roundTripOk, showRoundTrip,
}: ActionColumnProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onLoadFile(file); e.target.value = ""; }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onLoadFile(file);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 border-l border-r border-border bg-surface-soft overflow-y-auto shrink-0 w-[220px]",
        isDragOver && "ring-2 ring-inset ring-border-strong",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />

      {/* Upload file */}
      <Button
        variant="secondary"
        size="sm"
        className={BTN}
        style={S_UPLOAD}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={14} aria-hidden />
        Upload file
      </Button>

      <div className="my-0.5 h-px bg-border-subtle" />

      {/* Copy result */}
      <Button variant="secondary" size="sm" className={BTN} style={S_GHOST} onClick={onCopy}>
        <Copy size={14} aria-hidden />
        Copy result
      </Button>

      {/* Strip whitespace */}
      <Button variant="secondary" size="sm" className={BTN} style={S_GHOST} onClick={onStripWhitespace}>
        <ScanLine size={14} aria-hidden />
        Strip whitespace
      </Button>

      <div className="my-0.5 h-px bg-border-subtle" />

      {/* Swap panes */}
      <Button variant="secondary" size="sm" className={BTN} style={S_GHOST} onClick={onSwap}>
        <ArrowLeftRight size={14} aria-hidden />
        Swap panes
      </Button>

      {/* Download */}
      <Button variant="secondary" size="sm" className={BTN} style={S_GHOST} onClick={onDownload}>
        <Download size={14} aria-hidden />
        Download
      </Button>

      {/* Share URL */}
      <Button variant="secondary" size="sm" className={BTN} style={S_GHOST} onClick={onShare}>
        <Link2 size={14} aria-hidden />
        Share URL
      </Button>

      <div className="my-0.5 h-px bg-border-subtle" />

      {/* Try an example */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className={BTN} style={S_GHOST}>
            <BookOpen size={14} aria-hidden />
            Try an example
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          {PRESETS.map((preset) => {
            const Icon = PRESET_ICON[preset.icon] ?? Lock;
            return (
              <DropdownMenuItem key={preset.id} onClick={() => onPreset(preset)}>
                <Icon size={13} aria-hidden />
                {preset.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Round-trip badge — pinned bottom */}
      {showRoundTrip && (
        <div className="mt-auto pt-3 border-t border-border-subtle">
          <RoundTripBadge ok={roundTripOk} />
        </div>
      )}
    </div>
  );
}
