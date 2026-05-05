"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Copy, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/primitives/Textarea";
import { Button } from "@/components/primitives/Button";
import { Switch } from "@/components/primitives/Switch";
import { Toggle } from "@/components/primitives/Toggle";
import { Badge } from "@/components/primitives/Badge";
import { ToolShell } from "@/components/layout/ToolShell";
import {
  decodeText,
  encodeFile,
  encodeText,
  looksLikeBase64,
} from "./base64.lib";
import type { Tool } from "@/lib/tools-registry";
import { cn } from "@/lib/cn";

type Direction = "encode" | "decode";

export function Base64({ tool }: { tool: Tool }) {
  const [direction, setDirection] = useState<Direction>("encode");
  const [autoDetect, setAutoDetect] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);
  const [text, setText] = useState("DevToolbox is fast.");
  const [encoded, setEncoded] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effective direction (auto-detect picks decode when input looks like base64).
  const activeDirection: Direction = useMemo(() => {
    if (!autoDetect) return direction;
    if (direction === "encode" && looksLikeBase64(encoded || text)) return "decode";
    return direction;
  }, [autoDetect, direction, text, encoded]);

  // Encode and decode each own one direction so the effect that writes a state
  // never re-fires itself by depending on what it just wrote.
  useEffect(() => {
    if (activeDirection !== "encode") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
     
    setEncoded(encodeText(text, { urlSafe }));
  }, [text, urlSafe, activeDirection]);

  useEffect(() => {
    if (activeDirection !== "decode") return;
    const result = decodeText(encoded, { urlSafe });
    if (result.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(result.text);
       
      setError(null);
    } else {
       
      setError(result.message);
    }
  }, [encoded, urlSafe, activeDirection]);

  const onSwap = () => {
    setDirection((d) => (d === "encode" ? "decode" : "encode"));
  };

  const onFile = async (file: File) => {
    try {
      const b64 = await encodeFile(file, { urlSafe });
      setEncoded(b64);
      setDirection("encode");
      toast.success(`${file.name} encoded`, {
        description: `${b64.length.toLocaleString()} characters`,
      });
    } catch (err) {
      toast.error("Could not read file", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const onCopy = async (value: string, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`);
  };

  return (
    <ToolShell
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={onSwap}>
            <ArrowLeftRight size={13} />
            Swap direction
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setText("");
              setEncoded("");
            }}
          >
            Clear
          </Button>
          <span className="ml-auto flex items-center gap-2 text-xs text-text-muted">
            Mode <Badge variant="brand" uppercase>{activeDirection}</Badge>
            {urlSafe && <Badge variant="info" uppercase>URL-safe</Badge>}
          </span>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Toggle
            pressed={direction === "encode"}
            onPressedChange={(v) => v && setDirection("encode")}
            aria-label="Encode"
          >
            Encode
          </Toggle>
          <Toggle
            pressed={direction === "decode"}
            onPressedChange={(v) => v && setDirection("decode")}
            aria-label="Decode"
          >
            Decode
          </Toggle>
        </div>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
          Auto-detect
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <Switch checked={urlSafe} onCheckedChange={setUrlSafe} />
          URL-safe alphabet
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          label="Plain text"
          headerExtra={
            <span className="text-xs text-text-faint font-mono">
              {text.length} chars
            </span>
          }
          onCopy={() => onCopy(text, "text")}
        >
          <Textarea
            rows={12}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (activeDirection === "decode") setDirection("encode");
            }}
            placeholder="Type plain text to encode…"
            className="border-0 bg-transparent focus:bg-transparent"
          />
        </Panel>

        <Panel
          label="Base64"
          headerExtra={
            <span className="text-xs text-text-faint font-mono">
              {encoded.length} chars
            </span>
          }
          onCopy={() => onCopy(encoded, "Base64")}
        >
          <Textarea
            rows={12}
            value={encoded}
            onChange={(e) => {
              setEncoded(e.target.value);
              if (activeDirection === "encode") setDirection("decode");
            }}
            placeholder="Paste Base64 to decode, or drop a file below to encode it."
            className="border-0 bg-transparent focus:bg-transparent break-all"
          />
        </Panel>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs-plus text-danger">
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void onFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 cursor-pointer transition-colors",
          dragActive
            ? "border-brand bg-brand-dim/50 text-text"
            : "border-border bg-surface text-text-muted hover:border-border-strong hover:bg-surface-soft",
        )}
      >
        <FileUp size={20} className={cn(dragActive ? "text-brand" : "text-text-faint")} />
        <p className="text-sm font-medium">Drop a file to encode</p>
        <p className="text-xs text-text-faint">
          Any file type · Encoded entirely in your browser
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </div>
    </ToolShell>
  );
}

interface PanelProps {
  label: string;
  headerExtra?: React.ReactNode;
  onCopy: () => void;
  children: React.ReactNode;
}

function Panel({ label, headerExtra, onCopy, children }: PanelProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle">
        <span className="text-xs uppercase tracking-wider text-text-faint">{label}</span>
        <div className="flex items-center gap-3">
          {headerExtra}
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
          >
            <Copy size={12} /> Copy
          </button>
        </div>
      </div>
      <div className="p-1">{children}</div>
    </div>
  );
}
