"use client";

import { Eraser, ImageUp, Keyboard, PenLine } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/primitives/dialog";
import { cn } from "@/lib/cn";
import { uploadAsset, type HandFont, type SigAsset } from "../sign-pdf.canvas";
import { INKS, STROKES, type Ink, type SigMode, type Stroke } from "../use-sign-pdf";
import { SignPad } from "./sign-pad";

const MODES = [
  { id: "draw", label: "Draw", Icon: PenLine },
  { id: "type", label: "Type", Icon: Keyboard },
  { id: "upload", label: "Upload", Icon: ImageUp },
] as const satisfies readonly { id: SigMode; label: string; Icon: typeof PenLine }[];

const CREAM = "bg-[#f6f2ea]";

export interface SignatureState {
  mode: SigMode;
  setMode: (m: SigMode) => void;
  ink: Ink;
  setInk: (i: Ink) => void;
  stroke: Stroke;
  setStroke: (w: Stroke) => void;
  drawn: SigAsset | null;
  setDrawn: (a: SigAsset | null) => void;
  uploaded: SigAsset | null;
  setUploaded: (a: SigAsset | null) => void;
  typed: string;
  setTyped: (t: string) => void;
  font: number;
  setFont: (i: number) => void;
  initials: string;
  setInitials: (t: string) => void;
  initialsText: string;
  initAsset: SigAsset | null;
  sigAsset: SigAsset | null;
  remember: boolean;
  setRemember: (v: boolean) => void;
}

/**
 * "Your signature" — made in a roomy modal: a wide draw pad, typed name in a
 * handwriting font, or a photo with the paper removed. Changes apply as you
 * go; Done just closes.
 */
export function SignatureDialog({
  open,
  onOpenChange,
  s,
  fonts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  s: SignatureState;
  fonts: readonly HandFont[];
}) {
  const upRef = useRef<HTMLInputElement>(null);
  const [upErr, setUpErr] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 flex max-h-[calc(100dvh-32px)] w-[min(820px,calc(100vw-24px))] -translate-y-1/2 flex-col overflow-hidden">
        <div className="flex flex-col gap-1 px-5 pt-5 pr-16 pb-3">
          <DialogTitle className="font-sans text-lg font-bold">Your signature</DialogTitle>
          <DialogDescription className="text-[13px] text-text-faint">Draw it, type it, or upload a photo. It stays in this browser.</DialogDescription>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-auto px-5 pb-5">
          <div role="tablist" aria-label="Signature style" className="grid grid-cols-3 gap-1 rounded-[11px] border border-white/7 bg-[#0d0d0c] p-1">
            {MODES.map(({ id, label, Icon }) => {
              const on = s.mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => s.setMode(id)}
                  className={cn(
                    "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 text-[13.5px] font-semibold transition-colors max-sm:min-h-11",
                    on ? "bg-selected text-text" : "bg-transparent text-text-tertiary hover:text-text",
                  )}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          {s.mode === "draw" && (
            <div className="flex flex-col gap-3">
              <SignPad ink={s.ink} stroke={s.stroke} value={s.drawn} onChange={s.setDrawn} />
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-text-faint">Ink</span>
                {INKS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    aria-label={`${k.label} ink`}
                    aria-pressed={s.ink === k.id}
                    onClick={() => s.setInk(k.id)}
                    className={cn(
                      "size-7 cursor-pointer rounded-full border-2 ring-1 ring-white/20 max-sm:size-10",
                      s.ink === k.id ? "border-text" : "border-transparent",
                    )}
                    style={{ background: k.id }}
                  />
                ))}
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />
                <span className="text-xs text-text-faint">Pen</span>
                <div role="radiogroup" aria-label="Pen width" className="flex gap-0.5 rounded-lg border border-white/7 bg-[#0d0d0c] p-0.5">
                  {STROKES.map((w) => (
                    <button
                      key={w.px}
                      type="button"
                      role="radio"
                      aria-checked={s.stroke === w.px}
                      aria-label={`${w.label} pen`}
                      title={w.label}
                      onClick={() => s.setStroke(w.px)}
                      className={cn(
                        "flex h-8 w-11 cursor-pointer items-center justify-center rounded-md border-0 max-sm:h-11",
                        s.stroke === w.px ? "bg-selected" : "bg-transparent hover:bg-white/5",
                      )}
                    >
                      <span className="block w-6 rounded-full" style={{ height: w.px, background: s.ink === "#111111" ? "#e8e4da" : s.ink }} />
                    </button>
                  ))}
                </div>
                <span className="grow" />
                <button
                  type="button"
                  onClick={() => s.setDrawn(null)}
                  disabled={!s.drawn}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-transparent px-3 text-[13px] text-text-strong hover:border-white/25 disabled:cursor-default disabled:opacity-40 max-sm:min-h-11"
                >
                  <Eraser size={14} aria-hidden /> Clear
                </button>
              </div>
            </div>
          )}

          {s.mode === "type" && (
            <div className="flex flex-col gap-3">
              <input
                value={s.typed}
                onChange={(e) => s.setTyped(e.target.value)}
                aria-label="Your name"
                placeholder="Type your name"
                autoComplete="name"
                autoFocus
                className="min-h-11 rounded-[10px] border border-white/10 bg-[#0d0d0c] px-3.5 text-[15px] text-[#f0ece2] outline-none placeholder:text-placeholder focus-visible:border-border-strong"
              />
              <div role="radiogroup" aria-label="Handwriting style" className="grid gap-2 sm:grid-cols-3">
                {fonts.map((f, i) => (
                  <button
                    key={f.family}
                    type="button"
                    role="radio"
                    aria-checked={s.font === i}
                    onClick={() => s.setFont(i)}
                    className={cn(
                      "flex min-h-[86px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 px-3 text-[34px] leading-tight",
                      CREAM,
                      s.font === i ? "border-cat-clay" : "border-transparent opacity-80 hover:opacity-100",
                    )}
                    style={{ fontFamily: f.family, fontWeight: f.weight, color: s.ink }}
                  >
                    <span className="truncate">{s.typed || "Your name"}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-text-faint">Ink</span>
                {INKS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    aria-label={`${k.label} ink`}
                    aria-pressed={s.ink === k.id}
                    onClick={() => s.setInk(k.id)}
                    className={cn("size-7 cursor-pointer rounded-full border-2 ring-1 ring-white/20 max-sm:size-10", s.ink === k.id ? "border-text" : "border-transparent")}
                    style={{ background: k.id }}
                  />
                ))}
              </div>
            </div>
          )}

          {s.mode === "upload" && (
            <div className="flex flex-col gap-3">
              <input
                ref={upRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUpErr("");
                  uploadAsset(f)
                    .then(s.setUploaded)
                    .catch((err: unknown) => setUpErr(err instanceof Error ? err.message : "That image couldn't be opened."));
                }}
              />
              <button
                type="button"
                onClick={() => upRef.current?.click()}
                className={cn(
                  "flex aspect-[1400/620] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-0 p-4",
                  s.uploaded ? CREAM : "border-[1.5px] border-dashed border-white/16 bg-transparent hover:border-white/30",
                )}
              >
                {s.uploaded ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.uploaded.url} alt="Your uploaded signature" className="max-h-full max-w-full object-contain" />
                ) : (
                  <>
                    <ImageUp size={26} aria-hidden className="text-cat-clay" />
                    <span className="text-[15px] font-semibold text-text">Upload a photo of your signature</span>
                    <span className="text-[12.5px] text-text-faint">Sign on white paper, take a photo — the paper is removed automatically</span>
                  </>
                )}
              </button>
              {s.uploaded && (
                <button type="button" onClick={() => upRef.current?.click()} className="cursor-pointer self-start border-0 bg-transparent p-0 text-[13px] text-text-tertiary underline underline-offset-4 hover:text-text">
                  Use a different photo
                </button>
              )}
              {upErr && (
                <span role="alert" className="text-[13px] text-[#f0a892]">
                  {upErr}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">
            <label htmlFor="sig-initials" className="text-[13px] font-semibold text-text-strong">
              Initials
            </label>
            <input
              id="sig-initials"
              value={s.initials}
              onChange={(e) => s.setInitials(e.target.value.slice(0, 4))}
              placeholder={s.initialsText || "AL"}
              className="min-h-9 w-24 rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 font-mono text-sm text-[#f0ece2] outline-none focus-visible:border-border-strong max-sm:min-h-11"
            />
            <span className={cn("flex h-10 w-20 items-center justify-center rounded-lg px-2", CREAM)} aria-hidden="true">
              {s.initAsset && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.initAsset.url} alt="" className="max-h-full max-w-full object-contain" />
              )}
            </span>
            <span className="grow" />
            <button
              type="button"
              role="switch"
              aria-checked={s.remember}
              onClick={() => s.setRemember(!s.remember)}
              className="inline-flex min-h-9 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-[13px] text-text-key max-sm:min-h-11"
            >
              <span aria-hidden="true" className={cn("relative h-5 w-[34px] shrink-0 rounded-full transition-colors", s.remember ? "bg-cat-clay" : "bg-white/14")}>
                <span className={cn("absolute top-[3px] left-[3px] size-3.5 rounded-full bg-text transition-transform", s.remember && "translate-x-3.5")} />
              </span>
              Remember on this device
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border-subtle bg-[#121211] px-5 py-3.5">
          <span className="grow text-[12.5px] text-text-faint">{s.sigAsset ? "Changes apply to every signature on the document." : "Make a signature to continue."}</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={!s.sigAsset}
            className="btn-action min-h-10 cursor-pointer rounded-[10px] px-5 text-sm font-bold disabled:cursor-default disabled:opacity-40 max-sm:min-h-11"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
