"use client";

import { Globe, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { loadPage, type LoadedPage } from "./load-page";

/**
 * "Load from URL" for the SEO tools' top bar: fetch a live page through the
 * SEO checker's endpoint and hand it to the tool to fill its form. Says
 * plainly that the URL goes to our server.
 */
export function SeoLoadUrl({
  onLoad,
  placeholder = "example.com/page",
  label = "Load from URL",
  prepare,
}: {
  /** Fill the tool from the page. Return a short note ("Loaded 4 tags") or throw to report a problem. */
  onLoad: (page: LoadedPage) => string;
  placeholder?: string;
  label?: string;
  /** Adjust what was typed before fetching (e.g. add /sitemap.xml). */
  prepare?: (url: string) => string;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const page = await loadPage(prepare ? prepare(url.trim()) : url.trim());
      setNote({ ok: true, text: onLoad(page) });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "That page couldn't be loaded." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex min-w-0 grow basis-[340px] flex-wrap items-center gap-2">
      <label className="relative flex min-w-0 grow basis-[200px] items-center">
        <Globe size={14} aria-hidden className="pointer-events-none absolute left-2.5 text-text-faint" />
        <span className="sr-only">{label}</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          inputMode="url"
          spellCheck={false}
          title="Our server fetches the page; only the URL is sent and nothing is stored."
          className="min-h-[38px] w-full rounded-lg border border-white/10 bg-[#0d0d0c] pr-2.5 pl-8 font-mono text-[12.5px] text-[#f0ece2] outline-none placeholder:text-placeholder focus-visible:border-border-strong max-sm:min-h-11"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/14 bg-white/[.04] px-3 text-[12.5px] font-semibold text-text hover:border-white/25 disabled:cursor-default disabled:opacity-40 max-sm:min-h-11"
      >
        {busy && <Loader2 size={13} aria-hidden className="animate-spin" />}
        {busy ? "Loading…" : label}
      </button>
      {note && (
        <span role="status" className={cn("basis-full text-[12px]", note.ok ? "text-success-text" : "text-[#f0a892]")}>
          {note.text}
        </span>
      )}
    </form>
  );
}
