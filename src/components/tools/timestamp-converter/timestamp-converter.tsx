"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { TimestampConverterContent, seoData } from "./content";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useTimestampConverter } from "./useTimestampConverter";
import { DETECTED_FORMAT_LABEL, WORLD_ZONES, resolveDefaultPrimaryTz } from "./timestamp-converter.constants";
import {
  dayOfYearLine,
  formatInZone,
  relativePhrase,
  utcDateLine,
  worldZoneRow,
} from "./timestamp-converter.lib";
import { ConvertView, MoreMenu, TimeToolbar, type TimeExtra } from "./components/workspace";
import { ShortcutsOverlay } from "./components/shortcuts-overlay";
import { TimezoneCard } from "./components/timezone-card";
import { FormatsGrid } from "./components/formats-grid";
import { QuickReferenceChips } from "./components/quick-reference-chips";
import { CodePanel } from "./components/code-panel";
import { RightRail } from "./components/right-rail";
import { CompareMode } from "./modes/compare-mode";
import { ArithmeticMode } from "./modes/arithmetic-mode";
import { BatchMode } from "./modes/batch-mode";
import type { ToolMode } from "./timestamp-converter.types";

const MODE_TITLE: Record<Exclude<ToolMode, "single">, string> = {
  compare: "Compare time zones",
  arithmetic: "Date arithmetic",
  batch: "Batch convert",
};

const MODES: ToolMode[] = ["single", "compare", "arithmetic", "batch"];

export function TimestampConverter({ tool }: { tool: Tool }) {
  const s = useTimestampConverter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [extras, setExtras] = useState<ReadonlySet<TimeExtra>>(() => new Set());

  const toggleExtra = useCallback((id: TimeExtra) => {
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyPermalink = useCallback(() => {
    void s.copyPermalink().then(() => toast.success("Permalink copied"));
  }, [s]);

  // shortcut: ⌘ K — focus the input
  useShortcut({ key: "/", label: "Focus input" }, (e) => {
    e.preventDefault();
    inputRef.current?.focus();
    inputRef.current?.select();
  });
  // shortcut: ⌘ Enter — insert current timestamp
  useShortcut({ key: "enter", meta: true, label: "Insert current time" }, (e) => {
    e.preventDefault();
    s.useNow();
  });
  // shortcut: ⌘ ⇧ T — swap primary / secondary timezones
  useShortcut({ key: "t", meta: true, shift: true, label: "Swap time zones" }, (e) => {
    e.preventDefault();
    s.swapTimezones();
  });
  // shortcut: ⌘ L — copy permalink
  useShortcut({ key: "l", meta: true, label: "Copy permalink" }, (e) => {
    e.preventDefault();
    copyPermalink();
  });
  // shortcut: ⌘ C — copy primary ISO 8601 when no text is selected
  useShortcut({ key: "c", meta: true, label: "Copy ISO 8601" }, () => {
    if (window.getSelection()?.toString()) return;
    if (!s.formats) return;
    void navigator.clipboard
      .writeText(s.formats.iso8601Primary)
      .then(() => toast.success("Copied ISO 8601"));
  });
  // shortcut: Esc — clear input (also when the input is focused)
  useShortcut({ key: "escape", ignoreInEditable: false, label: "Clear input" }, () => s.clear());
  // shortcut: ? — toggle the shortcuts overlay
  useShortcut({ key: "?" }, (e) => {
    e.preventDefault();
    setHelpOpen((o) => !o);
  });
  // shortcut: ⌘ 1-4 — switch mode (Convert / Compare / Arithmetic / Batch)
  useShortcut({ key: "1", meta: true, label: "Switch to Convert" }, (e) => {
    e.preventDefault();
    s.setMode(MODES[0]);
  });
  useShortcut({ key: "2", meta: true, label: "Switch to Compare time zones" }, (e) => {
    e.preventDefault();
    s.setMode(MODES[1]);
  });
  useShortcut({ key: "3", meta: true, label: "Switch to Date arithmetic" }, (e) => {
    e.preventDefault();
    s.setMode(MODES[2]);
  });
  useShortcut({ key: "4", meta: true, label: "Switch to Batch convert" }, (e) => {
    e.preventDefault();
    s.setMode(MODES[3]);
  });

  const instant = s.parseResult.ok ? s.parseResult.instant : undefined;
  const raw = s.rawInput.trim();

  const view = useMemo(() => {
    if (!instant || !s.formats) return null;
    const deviceTz = resolveDefaultPrimaryTz();
    return {
      dateLine: utcDateLine(instant),
      rows: [
        { k: "Unix seconds", v: s.formats.unixS },
        { k: "Unix ms", v: s.formats.unixMs },
        { k: "ISO 8601", v: s.formats.iso8601Utc },
        { k: "RFC 2822", v: s.formats.rfc2822 },
        {
          k: s.primaryTz === deviceTz ? "Your time" : s.primaryTz,
          v: formatInZone(instant, s.primaryTz, { dateStyle: "medium", timeStyle: "long" }),
        },
        { k: "Day of year", v: dayOfYearLine(instant) },
      ],
      zones: WORLD_ZONES.map(([city, zone]) => worldZoneRow(instant, city, zone)),
    };
  }, [instant, s.formats, s.primaryTz]);

  // Re-evaluated every tick of the live clock (nowUnix).
  const relative = instant ? relativePhrase(instant.epochMilliseconds, s.nowUnix * 1000) : "Enter a time";

  const menu = (cls: string) => (
    <MoreMenu
      className={cls}
      mode={s.mode}
      onMode={s.setMode}
      open={extras}
      onToggle={toggleExtra}
      onSwap={s.swapTimezones}
      onPermalink={copyPermalink}
      onShortcuts={() => setHelpOpen(true)}
    />
  );

  let status: { tone: string; text: string; detail: string };
  if (instant) {
    status = { tone: "text-success", text: DETECTED_FORMAT_LABEL[s.parseResult.detectedFormat], detail: instant.toString() };
  } else if (raw) {
    status = { tone: "text-error", text: "Can’t read that time", detail: s.parseResult.error ?? "" };
  } else {
    status = { tone: "text-text-faint", text: "Waiting for input", detail: "" };
  }

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div id="main-content" className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        <TimeToolbar
          ref={inputRef}
          value={s.rawInput}
          onChange={s.setRawInput}
          parseResult={s.parseResult}
          onOverride={s.overrideFormat}
          onNow={s.useNow}
          menu={menu("size-12")}
        />

        {s.mode !== "single" && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2">
            <button
              type="button"
              onClick={() => s.setMode("single")}
              className="inline-flex min-h-10 items-center gap-2 rounded-[9px] px-3 text-[13px] font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
            >
              <ArrowLeft size={14} aria-hidden />
              Back to converter
            </button>
            <span className="text-[13px] font-semibold text-text">{MODE_TITLE[s.mode]}</span>
          </div>
        )}

        {s.mode === "single" && (
          <>
            <ConvertView
              ok={view !== null}
              relative={relative}
              dateLine={view?.dateLine ?? "Seconds, milliseconds or an ISO date all work."}
              rows={view?.rows ?? []}
              zones={view?.zones ?? WORLD_ZONES.map(([city, zone]) => ({ city, zone, time: "—", date: "" }))}
            />
            {extras.size > 0 && (
              <div className="flex flex-col gap-6 border-t border-border-subtle p-3 sm:p-4">
                {extras.has("zones") && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <TimezoneCard title="Primary" isPrimary view={s.primaryView} tz={s.primaryTz} onTzChange={s.setPrimaryTz} />
                    <TimezoneCard title="Secondary" view={s.secondaryView} tz={s.secondaryTz} onTzChange={s.setSecondaryTz} />
                  </div>
                )}
                {extras.has("formats") && <FormatsGrid formats={s.formats} />}
                {extras.has("reference") && (
                  <QuickReferenceChips parseResult={s.parseResult} primaryTz={s.primaryTz} onApply={s.setRawInput} />
                )}
                {extras.has("code") && (
                  <CodePanel
                    parseResult={s.parseResult}
                    primaryTz={s.primaryTz}
                    activeLanguage={s.activeLanguage}
                    onLanguage={s.setActiveLanguage}
                  />
                )}
                {extras.has("history") && <RightRail s={s} />}
              </div>
            )}
          </>
        )}
        {s.mode === "compare" && (
          <div className="p-3 sm:p-4">
            <CompareMode s={s} />
          </div>
        )}
        {s.mode === "arithmetic" && (
          <div className="p-3 sm:p-4">
            <ArithmeticMode s={s} />
          </div>
        )}
        {s.mode === "batch" && (
          <div className="p-3 sm:p-4">
            <BatchMode />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          <span className={status.tone}>● {status.text}</span>
          {status.detail && <span className="min-w-0 break-all">{status.detail}</span>}
          {s.dstWarning && (
            <span className="text-warning-text">
              DST change near {s.dstWarning.tz} ({s.dstWarning.transitionAt})
            </span>
          )}
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      <TimestampConverterContent />
      <ShortcutsOverlay open={helpOpen} onOpenChange={setHelpOpen} />
    </ToolShell>
  );
}
