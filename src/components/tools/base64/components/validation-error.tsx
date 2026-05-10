"use client";

import { AlertCircle } from "lucide-react";
import type { ValidationResult } from "../base64.types";

interface ValidationErrorProps {
  result: ValidationResult | null;
}

export function ValidationError({ result }: ValidationErrorProps) {
  if (!result || result.valid || !result.error) return null;
  const { message, hint } = result.error;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
    >
      <AlertCircle size={14} aria-hidden className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium break-words">{message}</p>
        {hint && <p className="text-text-muted mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
