"use client";

import { useCallback, useMemo, useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/primitives/dropdown-menu";
import {
  EncChip,
  EncError,
  EncWorkspace,
  readFileText,
  type EncMode,
  type EncStatus,
} from "@/components/tools/base64/enc-workspace";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { UrlEncoderContent, seoData } from "./content";
import { URL_SAMPLE, decodeUrl, encodeUrl, looksEncoded } from "./url-encoder.lib";

const chars = (n: number) => `${n.toLocaleString()} chars`;

export function UrlEncoder({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(URL_SAMPLE);
  const [mode, setMode] = useState<EncMode>("encode");
  const [fullUrl, setFullUrl] = useState(false);
  const [spaceAsPlus, setSpaceAsPlus] = useState(false);
  const [strict, setStrict] = useState(false);
  const [plusAsSpace, setPlusAsSpace] = useState(true);
  const enc = mode === "encode";

  const result = useMemo(
    () => (enc ? encodeUrl(input, { fullUrl, spaceAsPlus, strict }) : decodeUrl(input, { fullUrl, plusAsSpace })),
    [enc, input, fullUrl, spaceAsPlus, strict, plusAsSpace],
  );
  const output = result.ok ? result.output : "";
  const bad = !result.ok;

  const swap = useCallback(() => {
    if (!result.ok) return;
    setInput(result.output);
    setMode(enc ? "decode" : "encode");
  }, [result, enc]);

  useShortcut({ key: "x", meta: true, shift: true, label: "Swap input and output" }, (e) => { e.preventDefault(); swap(); });
  useShortcut({ key: "u", meta: true, shift: true, label: "Toggle full URL" }, (e) => { e.preventDefault(); setFullUrl((v) => !v); });

  const onUpload = useCallback(async (f: File) => {
    const text = await readFileText(f);
    if (text !== null) setInput(text);
  }, []);

  const outLen = result.ok ? result.output.length : 0;
  const optLabel = "Full URL (keep : / ? & =)";
  const extras: string[] = [];
  if (fullUrl) extras.push("Full URL");
  if (enc && spaceAsPlus) extras.push("spaces as +");
  if (enc && strict) extras.push("RFC 3986");
  if (result.ok) extras.push(`${result.escapes.toLocaleString()} %-escapes`);

  const status: EncStatus = !input
    ? { tone: "idle", text: "Waiting for input" }
    : bad
      ? { tone: "error", text: "Invalid input" }
      : { tone: "ok", text: enc ? "Encoded" : "Decoded", detail: [`${chars(input.length)} in · ${chars(outLen)} out`, ...extras].join(" · ") };

  const banner =
    enc && looksEncoded(input) ? (
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-info-bg px-4 py-2 text-[13px] text-text-muted">
        This already looks percent-encoded.
        <EncChip onClick={() => setMode("decode")}>Decode it</EncChip>
      </div>
    ) : null;

  const moreMenu = (
    <>
      <DropdownMenuLabel className="text-xs">Encoding</DropdownMenuLabel>
      <DropdownMenuCheckboxItem checked={spaceAsPlus} onCheckedChange={(v) => setSpaceAsPlus(v === true)}>
        Spaces as + (form encoding)
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={strict} onCheckedChange={(v) => setStrict(v === true)}>
        {"Strict RFC 3986 (also ! ' ( ) *)"}
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs">Decoding</DropdownMenuLabel>
      <DropdownMenuCheckboxItem checked={plusAsSpace} onCheckedChange={(v) => setPlusAsSpace(v === true)}>
        Read + as a space
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          void navigator.clipboard.readText().then((t) => t && setInput(t)).catch(() => undefined);
        }}
      >
        Paste from clipboard
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setInput(URL_SAMPLE)}>Load example</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setInput("")} disabled={!input}>Clear input</DropdownMenuItem>
    </>
  );

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <EncWorkspace
        id="url-in"
        mode={mode}
        onModeChange={setMode}
        option={{
          label: optLabel,
          on: fullUrl,
          onToggle: () => setFullUrl((v) => !v),
          title: enc
            ? "On: keep URL delimiters so the address still works. Off: encode everything, for a single value. (⌘⇧U)"
            : "On: leave escaped delimiters (%2F, %26, %3D…) alone so the URL's structure can't change. (⌘⇧U)",
        }}
        sizes={`${chars(input.length)} → ${chars(outLen)}`}
        inLabel={enc ? "Text" : "Encoded"}
        outLabel={enc ? "Encoded" : "Text"}
        input={input}
        onInput={setInput}
        placeholder={enc ? "Type or paste text or a URL" : "Paste a percent-encoded string"}
        onUpload={(f) => void onUpload(f)}
        uploadLabel="Load a text file"
        liveStatus={bad ? { text: "Invalid input", tone: "error" } : { text: "Live", tone: "ok" }}
        output={output}
        outTone={bad ? "error" : enc ? "encoded" : "decoded"}
        outputBody={
          result.ok ? undefined : (
            <EncError
              message={result.error}
              hint={
                result.position !== undefined
                  ? `Near: “${input.slice(Math.max(0, result.position - 12), result.position + 12)}”. A literal % has to be written as %25.`
                  : undefined
              }
            >
              {enc ? null : <EncChip onClick={() => setMode("encode")}>Encode it instead</EncChip>}
            </EncError>
          )
        }
        inputBanner={banner}
        onSwap={swap}
        canSwap={result.ok && !!output}
        moreMenu={moreMenu}
        status={status}
      />
      <UrlEncoderContent />
    </ToolShell>
  );
}
