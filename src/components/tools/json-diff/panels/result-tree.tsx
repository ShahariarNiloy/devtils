"use client";

import {
  ArrowRightLeft,
  Copy,
  Minus,
  Move,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  inlineDisplay,
  type DiffEntry,
  type DiffResult,
} from "../json-diff.lib";
import type { PointerStyle } from "../use-json-diff";

type Tone = "warning" | "info" | "success" | "danger";

const KIND_META: Record<
  DiffEntry["kind"],
  { label: string; tone: Tone; Icon: typeof Plus }
> = {
  type: { label: "Type changes", tone: "warning", Icon: ArrowRightLeft },
  changed: { label: "Changed", tone: "info", Icon: ArrowRightLeft },
  added: { label: "Added", tone: "success", Icon: Plus },
  removed: { label: "Removed", tone: "danger", Icon: Minus },
  moved: { label: "Moved", tone: "info", Icon: Move },
};

/**
 * Structural result view — entries grouped by kind. Section order is
 * intentional: type changes first (highest-priority — usually bugs),
 * then changed / added / removed, finally moved. Each section renders a
 * subtle left-edge stripe in the section's tone; rows use bg-tone/5 for
 * a faint wash (matches the side-by-side conventions in diff-checker).
 */
export function ResultTree({
  result,
  pointerStyle,
}: {
  result: DiffResult | null;
  pointerStyle: PointerStyle;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-text-faint">
        Enter valid JSON on both sides to see the diff.
      </div>
    );
  }

  if (result.stats.total === 0) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-success-border bg-success-bg px-4 py-8 text-success-text">
        <Sparkles size={16} />
        <span className="text-sm font-medium">
          No differences — JSON is semantically identical
        </span>
      </div>
    );
  }

  const order: DiffEntry["kind"][] = ["type", "changed", "added", "removed", "moved"];
  const groups = order
    .map((kind) => ({
      kind,
      entries: result.entries.filter((e) => e.kind === kind),
      ...KIND_META[kind],
    }))
    .filter((g) => g.entries.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <Stats result={result} />
      {groups.map((g) => (
        <Group
          key={g.kind}
          label={g.label}
          tone={g.tone}
          Icon={g.Icon}
          entries={g.entries}
          pointerStyle={pointerStyle}
        />
      ))}
    </div>
  );
}

function Stats({ result }: { result: DiffResult }) {
  const items: { label: string; count: number; tone: Tone }[] = [
    { label: "type", count: result.stats.typeChanges, tone: "warning" },
    { label: "changed", count: result.stats.changed, tone: "info" },
    { label: "added", count: result.stats.added, tone: "success" },
    { label: "removed", count: result.stats.removed, tone: "danger" },
    { label: "moved", count: result.stats.moves, tone: "info" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {items.map((it) =>
        it.count > 0 ? (
          <span
            key={it.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium",
              chipClasses(it.tone),
            )}
          >
            <span className="font-mono tabular-nums">{it.count}</span>
            <span className="opacity-80">{it.label}</span>
          </span>
        ) : null,
      )}
    </div>
  );
}

function Group({
  label,
  tone,
  Icon,
  entries,
  pointerStyle,
}: {
  label: string;
  tone: Tone;
  Icon: typeof Plus;
  entries: DiffEntry[];
  pointerStyle: PointerStyle;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
        <Icon size={12} className={textToneClass(tone)} />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
          {label}
        </span>
        <span className="font-mono text-xs text-text-faint">
          {entries.length}
        </span>
      </header>
      <ul className="divide-y divide-border-subtle">
        {entries.map((e) => (
          <li
            key={`${e.kind}-${e.pointer}-${e.move?.[0] ?? ""}-${e.move?.[1] ?? ""}`}
            className={cn("flex flex-col gap-1 px-4 py-3", rowToneClass(tone))}
          >
            <Entry entry={e} pointerStyle={pointerStyle} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Entry({
  entry,
  pointerStyle,
}: {
  entry: DiffEntry;
  pointerStyle: PointerStyle;
}) {
  const pathText =
    pointerStyle === "json-pointer" ? entry.pointer || "/" : entry.path || "$";

  const copyPath = () => {
    void navigator.clipboard.writeText(pathText);
    toast.success(`Copied ${pathText}`);
  };

  return (
    <>
      {/* Top: path + meta chip (move target / type change) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copyPath}
          className="group inline-flex min-w-0 items-center gap-1.5 text-left font-mono text-sm text-text transition-colors hover:text-brand"
          title="Copy path"
        >
          <span className="truncate">{pathText}</span>
          <Copy
            size={11}
            className="shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
          />
        </button>
        {entry.move && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-muted">
            [{entry.move[0]}] → [{entry.move[1]}]
          </span>
        )}
        {entry.typeChange && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 font-mono text-[11px] text-warning">
            {entry.typeChange[0]} → {entry.typeChange[1]}
          </span>
        )}
      </div>
      <ValuePair entry={entry} />
    </>
  );
}

function ValuePair({ entry }: { entry: DiffEntry }) {
  if (entry.kind === "moved") return null;
  if (entry.kind === "added") {
    return <ValueRow tone="success" prefix="+" value={entry.right} />;
  }
  if (entry.kind === "removed") {
    return <ValueRow tone="danger" prefix="−" value={entry.left} />;
  }
  // changed / type
  return (
    <div className="flex flex-col gap-0.5">
      <ValueRow tone="danger" prefix="−" value={entry.left} />
      <ValueRow tone="success" prefix="+" value={entry.right} />
    </div>
  );
}

function ValueRow({
  tone,
  prefix,
  value,
}: {
  tone: "success" | "danger";
  prefix: string;
  value: unknown;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 select-none items-center justify-center rounded-sm font-mono text-sm font-semibold",
          tone === "success"
            ? "bg-success-border text-success-text"
            : "bg-error-border text-error-text",
        )}
      >
        {prefix}
      </span>
      <code className="break-all font-mono text-sm leading-[1.6] text-text">
        {inlineDisplay(value as never, 240)}
      </code>
    </div>
  );
}

// ── Tone helpers ─────────────────────────────────────────────────────────────

function chipClasses(tone: Tone): string {
  switch (tone) {
    case "warning":
      return "bg-warning/10 text-warning";
    case "success":
      return "bg-success/10 text-success";
    case "danger":
      return "bg-danger/10 text-danger";
    case "info":
    default:
      return "bg-info/10 text-info";
  }
}

function textToneClass(tone: Tone): string {
  switch (tone) {
    case "warning":
      return "text-warning";
    case "success":
      return "text-success";
    case "danger":
      return "text-danger";
    case "info":
    default:
      return "text-info";
  }
}

function rowToneClass(tone: Tone): string {
  // Solid pale-tone wash on group rows. Earth-toned, readable, never
  // shouty — same palette as the side-by-side diff cells so the two views
  // feel like the same tool.
  switch (tone) {
    case "warning":
      return "bg-warning-bg/40";
    case "success":
      return "bg-success-bg/40";
    case "danger":
      return "bg-error-bg/40";
    case "info":
    default:
      return "bg-info-bg/30";
  }
}
