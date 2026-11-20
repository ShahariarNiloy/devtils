"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface ImagePreviewProps {
  bytes: Uint8Array;
  mime: string;
  onDownload: () => void;
}

/** Decoded image, its real dimensions and byte size. */
export function ImagePreview({ bytes, mime, onDownload }: ImagePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (bytes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }
    const blob = new Blob([bytes as BlobPart], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [bytes, mime]);

  if (!url) return null;
  const ext = mime.split("/").pop() ?? "bin";

  return (
    <div className="flex h-full min-h-[220px] flex-col">
      <div className="flex min-h-0 grow items-center justify-center bg-[repeating-conic-gradient(#171716_0%_25%,#121211_0%_50%)] bg-[length:16px_16px] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Decoded image preview"
          className="max-h-full max-w-full object-contain"
          onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle px-4 py-2 font-mono text-xs text-text-faint">
        <span>{mime}</span>
        {dims && <span>{dims.w}×{dims.h}</span>}
        <span>{(bytes.length / 1024).toFixed(1)} KB</span>
        <span className="grow" />
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 font-sans text-xs font-semibold text-text-key transition-colors hover:bg-white/6"
        >
          <Download size={13} aria-hidden /> Download .{ext}
        </button>
      </div>
    </div>
  );
}
