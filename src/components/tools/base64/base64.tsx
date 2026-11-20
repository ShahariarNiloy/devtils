"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/primitives/dropdown-menu";
import { encodeShareToken } from "@/components/tools/json-formatter/share-link";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { CHARSETS, PRESETS, decode, toDataUri } from "./base64.lib";
import type { Base64Variant, OutputTab } from "./base64.types";
import { HexDumpView } from "./components/hex-dump-view";
import { ImagePreview } from "./components/image-preview";
import { Base64Content, seoData } from "./content";
import { EncChip, EncError, EncWorkspace, type EncStatus, type EncTone } from "./enc-workspace";
import { DiffView } from "./panes/diff-view";
import { useBase64 } from "./use-base64";

const VIEWS: { value: OutputTab; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "hex", label: "Hex dump" },
  { value: "data-uri", label: "Data URI" },
  { value: "diff", label: "Round-trip diff" },
  { value: "image", label: "Image" },
];

const ALPHABETS: { value: Base64Variant; label: string }[] = [
  { value: "standard", label: "Standard (+ /)" },
  { value: "url-safe", label: "URL-safe (- _, no =)" },
  { value: "mime", label: "MIME (76-char lines)" },
  { value: "pem", label: "PEM (64-char lines)" },
];

const fmtB = (n: number) => `${n.toLocaleString()} B`;

export function Base64({ tool }: { tool: Tool }) {
  const s = useBase64();
  const router = useRouter();
  const enc = s.direction === "encode";
  const hasInput = s.input.length > 0;
  const decodeError = !enc ? (s.validation && !s.validation.valid ? s.validation.error : undefined) : undefined;
  const bad = !enc && hasInput && (!!decodeError || !!s.error);
  const hasImage = !!s.imageMime && s.outputBytes.length > 0;

  const inBytes = enc ? s.inputByteCount : s.inputCharCount;
  const outBytes = bad ? 0 : enc ? s.outputCharCount : s.inputByteCount;
  const sizes = `${fmtB(inBytes)} → ${fmtB(outBytes)}`;

  const isJson = useMemo(() => {
    if (enc || !s.output || hasImage) return false;
    const t = s.output.trim();
    if (!t.startsWith("{") && !t.startsWith("[")) return false;
    try {
      JSON.parse(t);
      return true;
    } catch {
      return false;
    }
  }, [enc, s.output, hasImage]);

  const dataUri = useMemo(() => {
    if (s.activeTab !== "data-uri" || !s.output) return "";
    if (enc) return toDataUri(s.output, s.fileInfo?.mime ?? "text/plain");
    return toDataUri(s.input, s.imageMime ?? "application/octet-stream");
  }, [s.activeTab, s.output, s.input, enc, s.fileInfo, s.imageMime]);

  // Encode mode: decode the output back and show it next to the input.
  const roundTripBack = useMemo(() => {
    if (s.activeTab !== "diff" || !enc || !s.output) return "";
    try {
      return decode(s.output, { variant: s.variant, charset: s.charset, stripWhitespace: true, autoPad: true }).output;
    } catch {
      return "";
    }
  }, [s.activeTab, enc, s.output, s.variant, s.charset]);

  const onCopy = useCallback(async () => {
    const text = s.activeTab === "data-uri" && dataUri ? dataUri : s.output;
    if (!text || bad) return false;
    await navigator.clipboard.writeText(text);
    return true;
  }, [s.activeTab, dataUri, s.output, bad]);

  const onShare = useCallback(() => {
    const url = s.shareUrl();
    if (!url) return;
    if (url.length > 8000) {
      toast.error("Too long to share as a link — copy the text instead");
      return;
    }
    void navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
  }, [s]);

  const openInJson = useCallback(async () => {
    const token = await encodeShareToken(s.output);
    if (!token) {
      toast.error("Too large to hand off — copy it instead");
      return;
    }
    router.push(`/tools/json-formatter#d=${token}`);
  }, [router, s.output]);

  const toggleUrlSafe = useCallback(() => {
    s.setVariant(s.variant === "url-safe" ? "standard" : "url-safe");
  }, [s]);

  useShortcut({ key: "Enter", meta: true, label: "Encode" }, (e) => { e.preventDefault(); s.encodeNow(); });
  useShortcut({ key: "d", meta: true, shift: true, label: "Decode" }, (e) => { e.preventDefault(); s.decodeNow(); });
  useShortcut({ key: "v", meta: true, shift: true, label: "Validate" }, (e) => { e.preventDefault(); s.validate(); });
  useShortcut({ key: "c", meta: true, shift: true, label: "Copy output" }, (e) => {
    e.preventDefault();
    void onCopy().then((ok) => ok && toast.success("Copied"));
  });
  useShortcut({ key: "x", meta: true, shift: true, label: "Swap input and output" }, (e) => { e.preventDefault(); s.swapPanes(); });
  useShortcut({ key: "w", meta: true, shift: true, label: "Strip whitespace" }, (e) => { e.preventDefault(); s.applyStripWhitespace(); });
  useShortcut({ key: "u", meta: true, shift: true, label: "Toggle URL-safe" }, (e) => { e.preventDefault(); toggleUrlSafe(); });

  // ── Output body ────────────────────────────────────────────────────────────
  const view = VIEWS.find((v) => v.value === s.activeTab) ?? VIEWS[0]!;
  let outputBody: ReactNode = undefined;
  if (bad) {
    const ch = decodeError?.char;
    outputBody = (
      <EncError
        message={decodeError?.message ?? s.error ?? "This isn't valid Base64. Check for stray characters or missing padding."}
        hint={decodeError?.hint}
      >
        {/\s/.test(s.input.trim()) && <EncChip onClick={s.applyStripWhitespace}>Strip whitespace</EncChip>}
        {(ch === "-" || ch === "_") && <EncChip onClick={() => s.setVariant("url-safe")}>Switch to URL-safe</EncChip>}
        {decodeError?.message.startsWith("MIME") && <EncChip onClick={() => s.setVariant("mime")}>Switch to MIME</EncChip>}
        <EncChip onClick={() => s.setDirection("encode")}>Encode it instead</EncChip>
      </EncError>
    );
  } else if (s.activeTab === "hex") {
    outputBody = <HexDumpView bytes={enc ? new TextEncoder().encode(s.output) : s.outputBytes} />;
  } else if (s.activeTab === "image" && hasImage && s.imageMime) {
    outputBody = <ImagePreview bytes={s.outputBytes} mime={s.imageMime} onDownload={s.download} />;
  } else if (s.activeTab === "data-uri") {
    outputBody = (
      <pre className="m-0 p-4 font-mono text-[12.5px] leading-[1.8] break-all whitespace-pre-wrap text-code-rose sm:text-[13px]">
        {dataUri || <span className="text-text-ghost">Nothing to wrap yet.</span>}
      </pre>
    );
  } else if (s.activeTab === "diff") {
    outputBody = enc ? (
      <DiffView original={s.input} encoded={roundTripBack} match={s.roundTripOk} />
    ) : (
      <p className="m-0 p-4 text-[13px] text-text-tertiary">The round-trip diff compares your text with its encoded-then-decoded copy. Switch to Encode to see it.</p>
    );
  } else if (isJson) {
    outputBody = (
      <div className="flex flex-col">
        <pre className="m-0 p-4 font-mono text-[12.5px] leading-[1.8] break-all whitespace-pre-wrap text-syntax-plain sm:text-[13px]">{s.output}</pre>
        <div className="px-4 pb-4">
          <EncChip onClick={() => void openInJson()}>Open in JSON formatter →</EncChip>
        </div>
      </div>
    );
  }

  const outLabel = s.activeTab !== "text" && !bad ? view.label : enc ? "Base64" : "Text";

  const liveStatus: { text: string; tone: EncTone } = bad
    ? { text: "Invalid input", tone: "error" }
    : s.isProcessing
      ? { text: "Working…", tone: "busy" }
      : { text: "Live", tone: "ok" };

  const extras: string[] = [];
  if (s.variant !== "standard") extras.push(ALPHABETS.find((a) => a.value === s.variant)?.label.split(" ")[0] ?? s.variant);
  if (s.charset !== "utf-8") extras.push(s.charset.toUpperCase());
  if (s.fileInfo) extras.push(s.fileInfo.name);
  const status: EncStatus = !hasInput
    ? { tone: "idle", text: "Waiting for input" }
    : bad
      ? { tone: "error", text: "Invalid input" }
      : {
          tone: "ok",
          text: enc ? "Encoded" : "Decoded",
          detail: [`${fmtB(inBytes)} in · ${fmtB(outBytes)} out`, ...extras].join(" · "),
        };
  const roundTrip = hasInput && !bad && !s.isProcessing ? (
    <span className={s.roundTripOk ? "text-success-text" : "text-warning"} title="Encode → decode gives back the exact input">
      round-trip {s.roundTripOk ? "✓" : "mismatch"}
    </span>
  ) : null;

  const moreMenu = (
    <>
      <DropdownMenuLabel className="text-xs">Output view</DropdownMenuLabel>
      {VIEWS.map((v) => (
        <DropdownMenuCheckboxItem
          key={v.value}
          checked={s.activeTab === v.value}
          disabled={v.value === "image" && !hasImage}
          onCheckedChange={() => s.setActiveTab(v.value)}
        >
          {v.label}
          {v.value === "image" && !hasImage && <span className="ml-auto text-xs text-text-ghost">no image</span>}
        </DropdownMenuCheckboxItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs">Alphabet</DropdownMenuLabel>
      {ALPHABETS.map((a) => (
        <DropdownMenuCheckboxItem key={a.value} checked={s.variant === a.value} onCheckedChange={() => s.setVariant(a.value)}>
          {a.label}
        </DropdownMenuCheckboxItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs">Text charset</DropdownMenuLabel>
      {CHARSETS.map((c) => (
        <DropdownMenuCheckboxItem key={c.value} checked={s.charset === c.value} onCheckedChange={() => s.setCharset(c.value)}>
          {c.label}
        </DropdownMenuCheckboxItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs">Examples</DropdownMenuLabel>
      {PRESETS.map((p) => (
        <DropdownMenuItem key={p.id} onSelect={() => s.loadPreset(p)}>
          {p.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => void s.pasteFromClipboard()}>Paste from clipboard</DropdownMenuItem>
      <DropdownMenuItem onSelect={s.applyStripWhitespace}>Strip whitespace</DropdownMenuItem>
      <DropdownMenuItem onSelect={s.applyAutoPad}>Add missing = padding</DropdownMenuItem>
      <DropdownMenuItem onSelect={s.download} disabled={!s.output || bad}>Download output</DropdownMenuItem>
      <DropdownMenuItem onSelect={onShare} disabled={!hasInput}>Copy share link</DropdownMenuItem>
      <DropdownMenuItem onSelect={s.clearInput} disabled={!hasInput}>Clear input</DropdownMenuItem>
    </>
  );

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <EncWorkspace
        id="b64-in"
        mode={s.direction}
        onModeChange={s.setDirection}
        option={{
          label: "URL-safe",
          on: s.variant === "url-safe",
          onToggle: toggleUrlSafe,
          title: "Swap + / for - _ and drop = padding (⌘⇧U)",
        }}
        sizes={sizes}
        inLabel={enc ? "Text" : "Base64"}
        outLabel={outLabel}
        input={s.input}
        onInput={s.setInput}
        placeholder={enc ? "Type or paste text, or drop a file" : "Paste Base64 or a data: URI"}
        onUpload={(f) => void s.loadFile(f)}
        liveStatus={liveStatus}
        output={s.output}
        outTone={bad ? "error" : enc ? "encoded" : "decoded"}
        outputBody={outputBody}
        outputHeaderExtra={
          s.activeTab !== "text" && !bad ? (
            <EncChip onClick={() => s.setActiveTab("text")} title="Back to the text view">
              ✕ <span className="sr-only">Close {view.label}, show</span> Text
            </EncChip>
          ) : null
        }
        onSwap={s.swapPanes}
        canSwap={!bad && (!!s.output || !!s.fileInfo)}
        onCopy={onCopy}
        moreMenu={moreMenu}
        status={status}
        statusExtra={roundTrip}
      />
      <Base64Content />
    </ToolShell>
  );
}
