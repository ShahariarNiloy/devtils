"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from '@/components/primitives/button';

interface ImagePreviewProps {
  bytes: Uint8Array;
  mime: string;
  onDownload: () => void;
}

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
    <div className="flex-1 min-h-0 flex flex-col rounded-card border border-border-subtle bg-surface overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3 px-3 h-9 border-b border-border-subtle">
        <span className="text-sm uppercase tracking-wider font-medium text-text-faint">Image preview</span>
        <Button variant="ghost" size="sm" onClick={onDownload}>
          <Download size={13} aria-hidden /> Download .{ext}
        </Button>
      </div>
      <div className="flex-1 min-h-0 p-3 flex items-center justify-center bg-surface-soft/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Decoded preview"
          className="max-h-full max-w-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            setDims({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
      </div>
      <div className="shrink-0 flex items-center gap-3 px-3 h-8 border-t border-border-subtle text-sm font-mono text-text-faint">
        <span>{mime}</span>
        {dims && <span>· {dims.w}×{dims.h}</span>}
        <span>· {(bytes.length / 1024).toFixed(1)} KB</span>
      </div>
    </div>
  );
}
