"use client";

import { memo } from "react";
import { cn } from "@/lib/cn";

export const GutterLines = memo(
  ({ numLines, errorLine }: { numLines: number; errorLine?: number }) => (
    <>
      {Array.from({ length: numLines }, (_, i) => {
        const n = i + 1;
        const isError = errorLine === n;
        return (
          <div
            key={n}
            className={cn(
              "px-1 text-right",
              isError && "bg-danger/20 text-danger rounded-sm"
            )}
          >
            {n}
          </div>
        );
      })}
    </>
  )
);
GutterLines.displayName = "GutterLines";
