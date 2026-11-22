/**
 * Shared classes for the two docks in the hero product window (tool dock in
 * the palette tab, example dock in the paste tab). 36px keys on phones,
 * 48px from `sm`; on phones a pseudo-element widens the hit area into the
 * gaps so each key is ~42×44px to touch without changing the drawn size.
 */
export const DOCK_LABEL =
  "rounded-md border border-border bg-[rgba(28,28,26,.95)] px-[9px] py-[3px] text-xs text-text-key";
export const DOCK_ROW = "surface-glass flex gap-1.5 rounded-2xl border border-border p-1.5 sm:gap-2 sm:p-2";
export const DOCK_BTN =
  "surface-key relative flex size-9 items-center justify-center rounded-xl font-mono text-xs font-medium transition-transform duration-150 hover:-translate-y-[3px] before:absolute before:-inset-x-[3px] before:-inset-y-1 before:content-[''] sm:size-12 sm:before:content-none";
