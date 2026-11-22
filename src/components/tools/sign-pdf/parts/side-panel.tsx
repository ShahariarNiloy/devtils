"use client";

import { CalendarDays, CaseUpper, Pencil, PenLine, Signature, SquareCheck, TextCursorInput, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PdfFacts } from "../../pdf-shared/pdf-inspect.lib";
import type { SigAsset } from "../sign-pdf.canvas";
import { FIELD_LABEL, type Field, type FieldKind } from "../sign-pdf.lib";

const TOOLS: readonly { id: FieldKind; Icon: LucideIcon }[] = [
  { id: "sig", Icon: Signature },
  { id: "init", Icon: CaseUpper },
  { id: "date", Icon: CalendarDays },
  { id: "text", Icon: TextCursorInput },
  { id: "check", Icon: SquareCheck },
];
const SECTION = "flex flex-col gap-2.5 border-t border-border-subtle p-3.5 first:border-t-0";
const HEAD = "text-[11.5px] font-bold tracking-[.05em] text-text-faint uppercase";

export function SidePanel({
  hasDoc,
  facts,
  sigAsset,
  initAsset,
  initialsText,
  onEditSignature,
  tool,
  onPickTool,
  dateText,
  fields,
  selId,
  onSelectField,
  onRemoveField,
  finishLabel,
  canFinish,
  busy,
  warning,
  onFinish,
}: {
  hasDoc: boolean;
  facts: PdfFacts | null;
  sigAsset: SigAsset | null;
  initAsset: SigAsset | null;
  initialsText: string;
  onEditSignature: () => void;
  tool: FieldKind | null;
  onPickTool: (k: FieldKind) => void;
  /** Today, in the format the next date will use. */
  dateText: string;
  fields: readonly Field[];
  selId: string | null;
  onSelectField: (f: Field) => void;
  onRemoveField: (id: string) => void;
  finishLabel: string;
  canFinish: boolean;
  busy: boolean;
  warning: string;
  onFinish: () => void;
}) {
  const hint: Record<FieldKind, string> = {
    sig: sigAsset ? "Your signature" : "Make one first",
    init: initialsText || "Your initials",
    date: `${dateText} · click it to change`,
    text: "Any words you type",
    check: "A tick for checkboxes",
  };

  return (
    <div className="flex min-w-0 flex-col border-t border-border-subtle lg:max-h-[900px] lg:overflow-auto lg:border-t-0 lg:border-l">
      {/* signature preview */}
      <div className={SECTION}>
        <span className={HEAD}>Your signature</span>
        {sigAsset ? (
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={onEditSignature}
              aria-label="Edit your signature"
              className="group relative flex h-[68px] min-w-0 grow cursor-pointer items-center justify-center rounded-[10px] border-0 bg-[#f6f2ea] px-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sigAsset.url} alt="Your signature" className="max-h-[52px] max-w-full object-contain" />
              <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-[#1a1a18]/80 text-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Pencil size={12} aria-hidden />
              </span>
            </button>
            <button
              type="button"
              onClick={onEditSignature}
              aria-label="Edit your initials"
              className="flex h-[68px] w-[68px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-[#f6f2ea] p-2"
            >
              {initAsset ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={initAsset.url} alt="Your initials" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[11px] text-[#1a1a18]/50">Initials</span>
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEditSignature}
            className="flex min-h-[68px] cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-white/16 bg-transparent text-[13.5px] font-semibold text-text hover:border-cat-clay/60"
          >
            <PenLine size={16} aria-hidden className="text-cat-clay" />
            Create your signature
          </button>
        )}
        {sigAsset && (
          <button type="button" onClick={onEditSignature} className="inline-flex cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent p-0 text-[12.5px] text-text-tertiary hover:text-text">
            <Pencil size={12} aria-hidden /> Edit signature & initials
          </button>
        )}
      </div>

      {/* place */}
      <div className={SECTION}>
        <span className={HEAD}>Add to the document</span>
        <div className="flex flex-col gap-1">
          {TOOLS.map(({ id, Icon }) => {
            const on = tool === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                disabled={!hasDoc}
                onClick={() => onPickTool(id)}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] border px-2 text-left transition-colors disabled:cursor-default disabled:opacity-40",
                  on ? "border-[rgba(224,160,114,.55)] bg-[rgba(224,160,114,.1)]" : "border-transparent bg-transparent hover:bg-white/4",
                )}
              >
                <span className={cn("surface-key flex size-8 shrink-0 items-center justify-center rounded-lg", on ? "text-cat-clay" : "text-text-strong")}>
                  <Icon size={16} aria-hidden />
                </span>
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-[13.5px] font-semibold text-text">{FIELD_LABEL[id]}</span>
                  <span className="truncate text-[11.5px] text-text-faint">{on ? "Click on the page to place it" : hint[id]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* placed */}
      {hasDoc && (
        <div className={SECTION}>
          <div className="flex items-baseline">
            <span className={cn(HEAD, "grow")}>Placed</span>
            <span className="text-xs text-text-faint">{fields.length}</span>
          </div>
          {fields.length === 0 && <span className="text-[12.5px] text-text-faint">Nothing yet — pick something above, then click on the page.</span>}
          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectField(f)}
                className={cn(
                  "flex min-h-8 grow cursor-pointer items-center rounded-lg border-0 px-2.5 text-left text-[12.5px] max-sm:min-h-11",
                  selId === f.id ? "bg-white/6 text-text" : "bg-transparent text-text-strong hover:bg-white/4",
                )}
              >
                <span className="grow">{FIELD_LABEL[f.kind]}</span>
                <span className="text-[11.5px] text-text-faint">Page {f.page + 1}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemoveField(f.id)}
                aria-label={`Remove ${FIELD_LABEL[f.kind]} on page ${f.page + 1}`}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-white/6 hover:text-text max-sm:size-11"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          ))}
          {facts && (
            <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0 text-[11.5px]">
              <li className="text-success-text">✓ Not password-protected</li>
              {facts.digitallySigned ? (
                <li className="text-[#f0a892]">! Already has a certificate-based signature — signing here will invalidate it</li>
              ) : (
                <li className="text-success-text">✓ No existing digital signatures to break</li>
              )}
            </ul>
          )}
        </div>
      )}

      <span className="grow" />
      <div className="flex flex-col gap-2 border-t border-border-subtle bg-[#121211] p-3.5">
        <button
          type="button"
          onClick={onFinish}
          disabled={!canFinish}
          aria-busy={busy || undefined}
          className="btn-action min-h-[46px] cursor-pointer rounded-[11px] text-[14.5px] font-bold disabled:cursor-default disabled:opacity-40"
        >
          {finishLabel}
        </button>
        {warning && (
          <span role="alert" className="text-xs leading-normal text-[#f0a892]">
            {warning}
          </span>
        )}
        <span className="text-[11.5px] leading-normal text-text-faint">
          A drawn or typed signature is a simple electronic signature. It&apos;s accepted for many everyday documents, but some need a certificate-based or handwritten one.
        </span>
      </div>
    </div>
  );
}
