"use client";

import {
  AlignLeft,
  Copy,
  MoreHorizontal,
  Search,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { MobileMode } from "./mobile-mode-switch";

interface MobileActionSheetProps {
  mode: MobileMode;
  /** Mode-dependent primary action. Disabled if its prerequisites aren't met. */
  hasInput: boolean;
  hasOutput: boolean;
  canFormat: boolean;
  onFormat: () => void;
  onMinify: () => void;
  onCopyOutput: () => void;
  onOpenFind: () => void;
  onOpenMore: () => void;
}

/**
 * Thumb-zone action bar. Pinned to the bottom of the viewport. The primary
 * action swaps between Format (Input mode) and Copy (Output mode) so the
 * obvious next step is always one tap away.
 */
export function MobileActionSheet({
  mode,
  hasInput,
  hasOutput,
  canFormat,
  onFormat,
  onMinify,
  onCopyOutput,
  onOpenFind,
  onOpenMore,
}: MobileActionSheetProps) {
  const isInput = mode === "input";

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-surface px-3 py-2.5",
        "shadow-[0_-4px_12px_rgba(26,26,24,0.04)]",
        "pb-[max(0.625rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="flex items-center gap-2">
        {isInput ? (
          <PrimaryButton
            disabled={!canFormat}
            onClick={onFormat}
            icon={<AlignLeft size={16} />}
            label="Format"
          />
        ) : (
          <PrimaryButton
            disabled={!hasOutput}
            onClick={onCopyOutput}
            icon={<Copy size={16} />}
            label="Copy"
          />
        )}

        {isInput ? (
          <SecondaryButton
            disabled={!hasInput}
            onClick={onMinify}
            icon={<Minimize2 size={17} />}
            aria-label="Minify"
          />
        ) : (
          <SecondaryButton
            disabled={!hasOutput}
            onClick={onOpenFind}
            icon={<Search size={17} />}
            aria-label="Find in JSON"
          />
        )}

        <SecondaryButton
          onClick={onOpenMore}
          icon={<MoreHorizontal size={18} />}
          aria-label="More actions"
        />
      </div>
    </div>
  );
}

function PrimaryButton({
  disabled,
  onClick,
  icon,
  label,
}: {
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-button text-[15px] font-semibold transition-[background,color,box-shadow,transform] duration-150 ease-out",
        "bg-brand text-bg shadow-btn-primary active:scale-[0.99] hover:bg-brand-hover",
        "disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-faint disabled:shadow-none disabled:active:scale-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface SecondaryButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  "aria-label": string;
  disabled?: boolean;
}

function SecondaryButton({
  onClick,
  icon,
  "aria-label": ariaLabel,
  disabled,
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-button border border-border bg-surface text-text-muted transition-colors",
        "hover:bg-surface-soft hover:text-text",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface",
      )}
    >
      {icon}
    </button>
  );
}
