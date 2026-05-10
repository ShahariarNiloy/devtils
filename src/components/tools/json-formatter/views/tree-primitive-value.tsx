"use client";

import { useCallback } from "react";
import { toast } from "sonner";

export function PrimitiveValue({ value }: { value: unknown }) {
  const handleCopy = useCallback(async () => {
    const text = value === null ? "null" : String(value);
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }, [value]);

  if (value === null) {
    return (
      <span
        className="text-text-faint italic cursor-pointer hover:opacity-70 transition-opacity"
        onClick={handleCopy}
        title="Click to copy"
      >
        null
      </span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span
        className="cursor-pointer hover:opacity-70 transition-opacity font-medium"
        style={{ color: "var(--color-clay)" }}
        onClick={handleCopy}
        title="Click to copy"
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span
        className="cursor-pointer hover:opacity-70 transition-opacity"
        style={{ color: "var(--color-clay)" }}
        onClick={handleCopy}
        title="Click to copy"
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "string") {
    const display = value.length > 80 ? `"${value.slice(0, 80)}…"` : `"${value}"`;
    return (
      <span
        className="text-brand cursor-pointer hover:opacity-70 transition-opacity break-all"
        onClick={handleCopy}
        title="Click to copy"
      >
        {display}
      </span>
    );
  }
  return <span className="text-text-muted">{String(value)}</span>;
}
