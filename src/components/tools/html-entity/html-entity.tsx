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
  EncWorkspace,
  readFileText,
  type EncMode,
  type EncStatus,
} from "@/components/tools/base64/enc-workspace";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { HtmlEntityContent, seoData } from "./content";
import { ENTITY_SAMPLE, decodeEntities, encodeEntities, looksEscaped } from "./html-entity.lib";

const chars = (n: number) => `${n.toLocaleString()} chars`;

export function HtmlEntity({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(ENTITY_SAMPLE);
  const [mode, setMode] = useState<EncMode>("encode");
  const [nonAscii, setNonAscii] = useState(false);
  const [preferNamed, setPreferNamed] = useState(false);
  const [quotes, setQuotes] = useState(true);
  const enc = mode === "encode";

  const encoded = useMemo(() => (enc ? encodeEntities(input, { nonAscii, preferNamed, quotes }) : null), [enc, input, nonAscii, preferNamed, quotes]);
  const decoded = useMemo(() => (enc ? null : decodeEntities(input)), [enc, input]);
  const output = encoded?.output ?? decoded?.output ?? "";

  const swap = useCallback(() => {
    setInput(output);
    setMode(enc ? "decode" : "encode");
  }, [output, enc]);

  useShortcut({ key: "x", meta: true, shift: true, label: "Swap input and output" }, (e) => { e.preventDefault(); swap(); });

  const onUpload = useCallback(async (f: File) => {
    const text = await readFileText(f);
    if (text !== null) setInput(text);
  }, []);

  const warn = !!decoded && (decoded.unknown.length > 0 || decoded.invalid > 0);
  const extras: string[] = [];
  if (encoded) extras.push(`${encoded.escaped.toLocaleString()} escaped`);
  if (decoded) extras.push(`${decoded.decoded.toLocaleString()} entities decoded`);
  if (enc && nonAscii) extras.push(preferNamed ? "non-ASCII · named" : "non-ASCII");
  if (enc && !quotes) extras.push("quotes kept");

  const status: EncStatus = !input
    ? { tone: "idle", text: "Waiting for input" }
    : { tone: "ok", text: enc ? "Encoded" : "Decoded", detail: [`${chars(input.length)} in · ${chars(output.length)} out`, ...extras].join(" · ") };

  const warning =
    decoded && warn ? (
      <span className="text-warning" title={decoded.unknown.slice(0, 12).join(" ")}>
        {decoded.unknown.length > 0 && `${decoded.unknown.length} unknown left as-is`}
        {decoded.unknown.length > 0 && decoded.invalid > 0 && " · "}
        {decoded.invalid > 0 && `${decoded.invalid} invalid → �`}
      </span>
    ) : null;

  const banner =
    enc && looksEscaped(input) ? (
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-info-bg px-4 py-2 text-[13px] text-text-muted">
        This already contains entities — encoding again turns &amp; into {"&amp;amp;"}.
        <EncChip onClick={() => setMode("decode")}>Decode it</EncChip>
      </div>
    ) : null;

  const moreMenu = (
    <>
      <DropdownMenuLabel className="text-xs">Encoding</DropdownMenuLabel>
      <DropdownMenuCheckboxItem checked={quotes} onCheckedChange={(v) => setQuotes(v === true)}>
        {"Escape quotes (\" and ')"}
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={preferNamed}
        disabled={!nonAscii}
        onCheckedChange={(v) => setPreferNamed(v === true)}
      >
        Named entities for non-ASCII (&amp;copy;)
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          void navigator.clipboard.readText().then((t) => t && setInput(t)).catch(() => undefined);
        }}
      >
        Paste from clipboard
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setInput(ENTITY_SAMPLE)}>Load example</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setInput("")} disabled={!input}>Clear input</DropdownMenuItem>
    </>
  );

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <EncWorkspace
        id="ent-in"
        mode={mode}
        onModeChange={setMode}
        option={{
          label: "Escape non-ASCII too",
          on: nonAscii,
          onToggle: () => setNonAscii((v) => !v),
          title: enc
            ? "Also turn é, —, © and emoji into numeric entities, for pages or emails that aren't UTF-8"
            : "Applies when encoding; decoding always understands named and numeric entities",
        }}
        sizes={`${chars(input.length)} → ${chars(output.length)}`}
        inLabel={enc ? "Text" : "HTML-escaped"}
        outLabel={enc ? "HTML-escaped" : "Text"}
        input={input}
        onInput={setInput}
        placeholder={enc ? "Type or paste text or HTML" : "Paste text with &amp; &lt; &#233; …"}
        onUpload={(f) => void onUpload(f)}
        uploadLabel="Load a text file"
        liveStatus={warn ? { text: "Some left as-is", tone: "busy" } : { text: "Live", tone: "ok" }}
        output={output}
        outTone={enc ? "encoded" : "decoded"}
        inputBanner={banner}
        onSwap={swap}
        canSwap={!!output}
        moreMenu={moreMenu}
        status={status}
        statusExtra={warning}
      />
      <HtmlEntityContent />
    </ToolShell>
  );
}
