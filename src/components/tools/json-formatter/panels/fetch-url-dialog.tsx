"use client";

import { useState } from "react";
import { Globe, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";

interface FetchUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoaded: (text: string, name: string) => void;
}

export function FetchUrlDialog({ open, onOpenChange, onLoaded }: FetchUrlDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setError("Enter a valid http(s) URL");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setError("Only http and https URLs are supported");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(trimmed, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = await res.text();
      const name = parsed.pathname.split("/").pop() || parsed.hostname;
      onLoaded(text, name);
      onOpenChange(false);
      setUrl("");
      toast.success(`Loaded ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fetch failed";
      const friendly = /failed to fetch/i.test(msg)
        ? "Fetch failed — likely a CORS or network error"
        : msg;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe size={14} className="text-text-muted" />
            Fetch JSON from URL
          </DialogTitle>
          <DialogDescription>
            Pull JSON from any public endpoint. Request runs locally — nothing
            is proxied through a server.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (error) setError(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) { e.preventDefault(); void handleFetch(); }
            }}
            placeholder="https://api.example.com/data.json"
            spellCheck={false}
            autoFocus
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 font-mono text-sm text-text placeholder:text-text-faint outline-none focus:border-brand transition-colors"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleFetch()}
              disabled={loading || !url.trim()}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Fetching…" : "Fetch"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
