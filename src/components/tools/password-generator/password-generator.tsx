"use client";

import { Eye, EyeOff, ListPlus, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { PasswordGeneratorContent, seoData } from "./content";
import {
  charClass,
  crackTime,
  DEFAULT_OPTIONS,
  enabledSetCount,
  entropyBits,
  generate,
  GUESSES_PER_SECOND,
  LENGTH_RANGE,
  STRENGTH_LABEL,
  strengthLevel,
  WORD_LIST_SIZE,
  WORDS_RANGE,
  type CharClass,
  type PasswordMode,
  type PasswordOptions,
  type StrengthLevel,
} from "./password-generator.lib";
import { Segmented, StatusBar, ToggleButton } from "./v2-controls";

/** Options (never the password) are remembered per browser. */
const STORAGE_KEY = "utilyx:password-generator:options";
const BATCH = 10;

const MODES: readonly { value: PasswordMode; label: string }[] = [
  { value: "chars", label: "Password" },
  { value: "phrase", label: "Passphrase" },
];

const CHAR_TONE: Record<CharClass, string> = {
  letter: "text-text",
  digit: "text-syntax-number",
  symbol: "text-clay-light",
  separator: "text-text-ghost",
};

const LEVEL_TEXT: Record<StrengthLevel, string> = {
  0: "text-error",
  1: "text-warning",
  2: "text-success",
  3: "text-success",
};
const LEVEL_BAR: Record<StrengthLevel, string> = {
  0: "bg-error",
  1: "bg-warning",
  2: "bg-success",
  3: "bg-success",
};

function loadOptions(): PasswordOptions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_OPTIONS;
    const o: PasswordOptions = { ...DEFAULT_OPTIONS };
    const rec = parsed as Record<string, unknown>;
    if (rec.mode === "chars" || rec.mode === "phrase") o.mode = rec.mode;
    if (typeof rec.length === "number") o.length = Math.min(LENGTH_RANGE.max, Math.max(LENGTH_RANGE.min, Math.round(rec.length)));
    if (typeof rec.words === "number") o.words = Math.min(WORDS_RANGE.max, Math.max(WORDS_RANGE.min, Math.round(rec.words)));
    for (const k of ["upper", "lower", "digits", "symbols", "noSimilar", "capitalize", "addNumber"] as const) {
      if (typeof rec[k] === "boolean") o[k] = rec[k];
    }
    if (enabledSetCount(o) === 0) o.lower = true;
    return o;
  } catch {
    return DEFAULT_OPTIONS;
  }
}

function saveOptions(o: PasswordOptions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
  } catch {
    // Private mode / blocked storage: options just won't be remembered.
  }
}

export function PasswordGenerator({ tool }: { tool: Tool }) {
  const [opts, setOpts] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  // Generated after mount: a server-rendered password would be shared by every visitor.
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore options and make the first password on the frame after mount.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const o = loadOptions();
      setOpts(o);
      setPassword(generate(o));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const update = (patch: Partial<PasswordOptions>) => {
    const next = { ...opts, ...patch };
    setOpts(next);
    saveOptions(next);
    setPassword(generate(next));
    setCopied(false);
  };

  const regenerate = () => {
    setPassword(generate(opts));
    setCopied(false);
  };

  useShortcut({ key: "enter", meta: true, label: "Generate new password" }, (e) => {
    e.preventDefault();
    regenerate();
  });

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const copyBatch = async () => {
    const list = Array.from({ length: BATCH }, () => generate(opts)).join("\n");
    try {
      await navigator.clipboard.writeText(list);
      toast.success(`Copied ${BATCH} new ${opts.mode === "phrase" ? "passphrases" : "passwords"}, one per line`);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const isPhrase = opts.mode === "phrase";
  const bits = entropyBits(opts);
  const level = strengthLevel(bits);
  const sets = enabledSetCount(opts);
  const lengthValue = isPhrase ? opts.words : opts.length;
  const range = isPhrase ? WORDS_RANGE : LENGTH_RANGE;
  const long = password.length > 28;

  const setToggle = (key: "upper" | "lower" | "digits" | "symbols") => {
    const isLast = opts[key] && sets === 1;
    return {
      on: opts[key],
      disabled: isLast,
      title: isLast ? "Keep at least one character set" : undefined,
      onToggle: () => update({ [key]: !opts[key] }),
    };
  };

  const toggles: { label: string; sample: string; on: boolean; disabled?: boolean; title?: string; onToggle: () => void }[] = isPhrase
    ? [
        { label: "Capitalise words", sample: "Maple-Orbit", on: opts.capitalize, onToggle: () => update({ capitalize: !opts.capitalize }) },
        { label: "Add a number", sample: "…-River7", on: opts.addNumber, onToggle: () => update({ addNumber: !opts.addNumber }) },
      ]
    : [
        { label: "Uppercase", sample: "A–Z", ...setToggle("upper") },
        { label: "Lowercase", sample: "a–z", ...setToggle("lower") },
        { label: "Numbers", sample: "0–9", ...setToggle("digits") },
        { label: "Symbols", sample: "!@#$%^&*", ...setToggle("symbols") },
        { label: "Avoid look-alikes", sample: "no 0 O l 1 I", on: opts.noSimilar, onToggle: () => update({ noSimilar: !opts.noSimilar }) },
      ];

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {/* Result + strength */}
        <div className="flex flex-col gap-3 border-b border-border-subtle bg-toolbar p-[18px]">
          <div className="surface-panel flex flex-wrap items-center gap-3 rounded-[14px] p-[18px]">
            <output
              aria-label={isPhrase ? "Generated passphrase" : "Generated password"}
              className={cn(
                "min-h-[1.4em] min-w-0 flex-[1_1_260px] font-mono leading-[1.4] break-all text-text",
                long ? "text-base sm:text-xl" : "text-xl sm:text-[26px]",
              )}
            >
              {hidden
                ? "•".repeat(password.length)
                : [...password].map((ch, i) => (
                    // Characters are positional and the string is replaced wholesale.
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={i} className={CHAR_TONE[charClass(ch, opts.mode)]}>
                      {ch}
                    </span>
                  ))}
            </output>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="inline-flex size-12 cursor-pointer items-center justify-center rounded-xl text-text-tertiary hover:bg-white/[0.06] hover:text-text"
              >
                <MoreHorizontal size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuItem onSelect={() => setHidden((v) => !v)}>
                  {hidden ? <Eye size={14} /> : <EyeOff size={14} />} {hidden ? "Show" : "Hide"} {isPhrase ? "passphrase" : "password"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void copyBatch()}>
                  <ListPlus size={14} /> Copy {BATCH} more, one per line
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              aria-label="Generate new"
              title="Generate new (⌘/Ctrl + Enter)"
              onClick={regenerate}
              className="size-12 cursor-pointer rounded-xl border border-white/[0.12] text-xl text-text-key hover:bg-white/[0.06]"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={() => void copy()}
              disabled={!password}
              className="btn-action min-h-12 cursor-pointer rounded-xl px-[18px] text-sm font-bold"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="grid grow grid-cols-4 gap-1">
              {([0, 1, 2, 3] as const).map((i) => (
                <span key={i} className={cn("h-1.5 rounded-full", i <= level ? LEVEL_BAR[level] : "bg-white/[0.08]")} />
              ))}
            </div>
            <span className={cn("text-[13px] font-bold", LEVEL_TEXT[level])}>{STRENGTH_LABEL[level]}</span>
          </div>
          <div className="text-xs text-text-faint">
            {Math.round(bits)} bits of entropy
            {isPhrase ? ` (${WORD_LIST_SIZE.toLocaleString("en")}-word list)` : ""} · {crackTime(bits)} at{" "}
            {(GUESSES_PER_SECOND / 1e9).toLocaleString("en")} billion tries a second
          </div>
        </div>

        {/* Options */}
        <div className="flex min-h-[320px] flex-wrap">
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 border-b border-border-subtle p-4 sm:border-r sm:border-b-0">
            <Segmented label="Kind" value={opts.mode} options={MODES} onChange={(mode) => update({ mode })} />
            <label className="flex items-center gap-3 text-[13px] text-text-tertiary">
              {isPhrase ? "Words" : "Length"}
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={1}
                value={lengthValue}
                onChange={(e) => update(isPhrase ? { words: Number(e.target.value) } : { length: Number(e.target.value) })}
                className="min-w-0 grow accent-accent"
              />
              <span className="w-8 text-right font-mono text-[15px] text-text">{lengthValue}</span>
            </label>
          </div>
          <div className="grid min-w-0 flex-[1_1_300px] grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] content-start gap-2 p-3">
            {toggles.map((t) => (
              <ToggleButton key={t.label} on={t.on} onToggle={t.onToggle} disabled={t.disabled} title={t.title} className="min-h-12 w-full">
                <span className="flex flex-col">
                  <span>{t.label}</span>
                  <span className="font-mono text-[11px] font-normal text-text-faint">{t.sample}</span>
                </span>
              </ToggleButton>
            ))}
          </div>
        </div>

        <StatusBar tone={LEVEL_TEXT[level]} text={STRENGTH_LABEL[level]} detail={`${Math.round(bits)} bits · generated locally`} />
      </div>

      <PasswordGeneratorContent />
    </ToolShell>
  );
}
