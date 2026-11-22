"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { FormatId, Result } from "../blur-placeholder.lib";

/** Segmented control button (mode, format, code tabs). */
export function Seg({
  on,
  onClick,
  children,
  role,
  className,
  controls,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  role?: "tab";
  className?: string;
  controls?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={role === "tab" ? on : undefined}
      aria-pressed={role === "tab" ? undefined : on}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "cursor-pointer border-0 font-semibold transition-colors max-sm:min-h-11",
        on ? "bg-selected text-text" : "bg-transparent text-text-tertiary hover:text-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Pill chip (samples, presets). */
export function Chip({
  on,
  onClick,
  children,
  mono,
  filled = true,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  mono?: boolean;
  filled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border text-xs transition-colors max-sm:min-h-11",
        mono ? "min-h-[30px] px-[11px] font-mono" : "min-h-7 px-2.5",
        on
          ? cn("border-[rgba(224,160,114,0.6)] text-tier-pro-text", filled && "bg-[rgba(224,160,114,0.1)]")
          : "border-white/10 bg-transparent text-text-tertiary hover:border-[rgba(224,160,114,0.6)]",
      )}
    >
      {children}
    </button>
  );
}

export const CHECKER = "repeating-conic-gradient(#1b1b19 0 25%, #121211 0 50%) 0 0 / 16px 16px";

/** The placeholder itself, painted the way each format would paint on a page. */
export function PlaceholderLayer({ id, r, blur }: { id: FormatId; r: Result; blur: number }) {
  const abs = "pointer-events-none absolute inset-0 h-full w-full object-cover";
  switch (id) {
    case "base64":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={r.b64} alt="" className={abs} style={{ filter: `blur(${blur}px)`, transform: "scale(1.12)" }} />;
    case "blurhash":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={r.bhPng} alt="" className={abs} />;
    case "thumbhash":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={r.thPng} alt="" className={abs} />;
    case "svg":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={r.svgUrl} alt="" className={abs} style={{ transform: "scale(1.04)" }} />;
    case "css":
      return (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ ...r.css, filter: `blur(${Math.round(blur * 1.4)}px)`, transform: "scale(1.15)" }}
        />
      );
    case "color":
      return <div className="pointer-events-none absolute inset-0" style={{ background: r.color }} />;
  }
}

/** Clipboard copy with the mockup's 1.4 s "Copied" label and a live-region announcement. */
export function useCopy() {
  const [copied, setCopied] = useState("");
  const [announce, setAnnounce] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = useCallback(async (id: string, text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setAnnounce(`Copied ${what}`);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setCopied("");
        setAnnounce("");
      }, 1400);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  }, []);
  return { copied, announce, copy };
}

export const TONE: Record<string, string> = {
  clay: "text-cat-clay",
  sage: "text-cat-sage",
  teal: "text-cat-teal",
  rose: "text-syntax-boolean",
  coral: "text-cat-rose",
  muted: "text-text-tertiary",
};
