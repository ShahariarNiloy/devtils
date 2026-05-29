"use client";

import { ArrowUpRight, Bookmark, RefreshCw, Trash2, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  STORAGE_KEY,
  deletePreset,
  loadPresets,
  savePreset,
  type Preset,
} from "../../image-compressor.presets";
import { CUSTOM_MODE_COPY, QUALITY_MODE_DEFS } from "../../image-compressor.modes";
import type { CompressionSettings, QualityMode } from "../../image-compressor.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CompressionSettings;
  onChange: (patch: Partial<CompressionSettings>) => void;
  dirtyCount: number;
  onRecompressDirty: () => void;
}

// The drawer exposes the same three named modes as the per-file picker.
// Custom mode is no longer user-selectable.
const SIMPLE_MODES = ["maximum", "high", "small"] as const;

export function SettingsDrawer({
  open,
  onOpenChange,
  settings,
  onChange,
  dirtyCount,
  onRecompressDirty,
}: Props) {
  // Presets are persisted in localStorage; we hydrate when the drawer
  // opens so SSR stays clean and so changes from another tab show up
  // next time the drawer is opened.
  const [presets, setPresets] = useState<Preset[]>([]);
  // Inline naming UI: when true the list shows an input + confirm/cancel
  // instead of the "Save current" button. Avoids window.prompt.
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  // Re-read from storage each time the drawer opens so a save made in
  // another tab (or earlier session) is reflected. The synchronous
  // setState here is the intended "sync external store → React" pattern.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) setPresets(loadPresets());
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cross-tab live updates: another tab writing the same localStorage key
  // fires a `storage` event here. Mirror it so an open drawer never shows
  // a stale list. (The event never fires in the tab that made the write —
  // those paths call setPresets directly.)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPresets(loadPresets());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleSaveConfirm = useCallback(() => {
    const name = draftName.trim();
    if (!name) return;
    const saved = savePreset(name, settings);
    if (!saved) {
      toast.error(
        "Couldn't save preset — browser storage is full or unavailable.",
      );
      return;
    }
    setPresets(loadPresets());
    setNaming(false);
    setDraftName("");
  }, [draftName, settings]);

  const handleSaveCancel = useCallback(() => {
    setNaming(false);
    setDraftName("");
  }, []);

  const handleApply = useCallback(
    (p: Preset) => {
      onChange(p.settings);
    },
    [onChange],
  );

  const handleDelete = useCallback((id: string) => {
    if (!deletePreset(id)) {
      toast.error("Couldn't delete preset — browser storage is unavailable.");
      return;
    }
    setPresets(loadPresets());
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-charcoal/30 backdrop-blur-sm",
            "data-[state=open]:animate-[fade-in_220ms_cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-[fade-out_180ms_ease-in]",
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed top-0 right-0 bottom-0 z-50 flex w-[min(440px,calc(100vw-32px))] flex-col border-l border-border-subtle bg-surface shadow-[-12px_0_40px_-20px_rgba(60,67,53,0.35)]",
            "data-[state=open]:animate-[sheet-right-in_320ms_cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-[sheet-right-out_240ms_cubic-bezier(0.32,0.72,0,1)]",
          )}
        >
          {/* ── Sheet header ────────────────────────────────────── */}
          <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4">
            <div className="flex flex-col gap-0.5">
              <Dialog.Title className="text-base font-semibold tracking-tight text-text">
                Compression settings
              </Dialog.Title>
              <p className="font-mono text-sm uppercase tracking-eyebrow text-text-faint">
                Applies to all files
              </p>
            </div>
            <Dialog.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-[color,background-color,transform] duration-150 ease-out-strong hover:bg-surface-soft hover:text-text active:scale-[0.92] cursor-pointer"
              aria-label="Close settings"
            >
              <X size={17} strokeWidth={1.7} />
            </Dialog.Close>
          </header>

          {/* ── Scrollable body ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-6">
              <section className="flex flex-col gap-2.5">
                <span className="font-mono text-sm uppercase tracking-eyebrow text-text-faint">
                  Quality
                </span>
                <QualityGrid
                  value={settings.qualityMode}
                  onChange={(qualityMode) => onChange({ qualityMode })}
                />
                <p className="text-sm leading-relaxed text-text-muted">
                  {settings.qualityMode === "custom"
                    ? CUSTOM_MODE_COPY.blurb
                    : QUALITY_MODE_DEFS[settings.qualityMode].blurb}
                </p>
              </section>

              <section className="flex flex-col gap-2.5 border-t border-border-subtle pt-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm uppercase tracking-eyebrow text-text-faint">
                    Presets
                  </span>
                  {!naming ? (
                    <button
                      type="button"
                      onClick={() => setNaming(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-text-muted transition-[color,background-color] duration-150 ease-out-strong hover:bg-surface-soft hover:text-text cursor-pointer"
                    >
                      <Bookmark size={13} strokeWidth={1.7} aria-hidden />
                      Save current
                    </button>
                  ) : null}
                </div>
                {naming ? (
                  <div className="flex items-center gap-2 rounded-lg border border-brand bg-canvas px-2.5 py-2">
                    <input
                      autoFocus
                      type="text"
                      value={draftName}
                      placeholder="Preset name…"
                      aria-label="Preset name"
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveConfirm();
                        else if (e.key === "Escape") handleSaveCancel();
                      }}
                      className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
                    />
                    <button
                      type="button"
                      onClick={handleSaveConfirm}
                      disabled={draftName.trim().length === 0}
                      className="inline-flex h-7 items-center rounded-md bg-brand px-2.5 text-sm font-semibold text-text-on-sage transition-[opacity] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCancel}
                      className="inline-flex h-7 items-center rounded-md px-2 text-sm font-medium text-text-muted transition-[color,background-color] hover:bg-surface-soft hover:text-text cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
                {presets.length === 0 && !naming ? (
                  <p className="text-sm leading-relaxed text-text-faint">
                    No saved presets yet. Click <em>Save current</em> to remember
                    these settings for next time.
                  </p>
                ) : presets.length === 0 ? null : (
                  <ul className="flex flex-col gap-1">
                    {presets.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-soft/40 px-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => handleApply(p)}
                          className="flex-1 truncate text-left font-medium text-text hover:text-brand cursor-pointer"
                          title={`Apply "${p.name}"`}
                        >
                          {p.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          aria-label={`Delete preset ${p.name}`}
                          title="Delete preset"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-faint transition-[color,background-color] duration-150 ease-out-strong hover:bg-surface hover:text-danger cursor-pointer"
                        >
                          <Trash2 size={13} strokeWidth={1.7} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p className="border-t border-border-subtle pt-4 text-sm leading-relaxed text-text-faint">
                Per-file overrides: click any row in the list to adjust
                quality for that file specifically.
              </p>
            </div>
          </div>

          {/* ── Sheet footer ────────────────────────────────────── */}
          {dirtyCount > 0 ? (
            <footer className="border-t border-border-subtle bg-surface px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  onRecompressDirty();
                  onOpenChange(false);
                }}
                className="group/cta inline-flex h-11 w-full items-center justify-between rounded-full bg-olive-ink pl-5 pr-1.5 text-sm font-semibold text-bone-cream transition-[opacity,transform] duration-150 ease-out-strong hover:opacity-95 active:scale-[0.99] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw size={15} strokeWidth={1.8} aria-hidden />
                  Re-compress {dirtyCount}{" "}
                  {dirtyCount === 1 ? "file" : "files"}
                </span>
                <span
                  aria-hidden
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bone-cream/15 transition-transform duration-200 ease-out-strong group-hover/cta:translate-x-px"
                >
                  <ArrowUpRight size={14} strokeWidth={2} />
                </span>
              </button>
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function QualityGrid({
  value,
  onChange,
}: {
  value: QualityMode;
  onChange: (m: QualityMode) => void;
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-1.5">
      {SIMPLE_MODES.map((m) => {
        const active = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-[color,background-color,border-color,transform] duration-150 ease-out-strong active:scale-[0.97] cursor-pointer",
              active
                ? "border-olive-ink bg-olive-ink text-bone-cream"
                : "border-border-subtle bg-surface-soft text-text hover:border-border-strong/60",
            )}
          >
            <span className="text-sm font-semibold">
              {QUALITY_MODE_DEFS[m].label}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "text-bone-cream/70" : "text-text-faint",
              )}
            >
              {QUALITY_MODE_DEFS[m].description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
