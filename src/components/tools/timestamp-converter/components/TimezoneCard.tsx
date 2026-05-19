"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { TimezonePicker } from "./TimezonePicker";
import type { TimezoneView } from "../timestamp-converter.types";

interface Props {
  title: string;
  isPrimary?: boolean;
  view: TimezoneView | null;
  tz: string;
  onTzChange: (tz: string) => void;
}

export function TimezoneCard({
  title,
  isPrimary,
  view,
  tz,
  onTzChange,
}: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -1 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "flex flex-col rounded-xl border bg-surface p-5",
        isPrimary ? "border-border" : "border-border-subtle",
      )}
    >
      {/* Zone identity + role tag */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <TimezonePicker value={tz} onChange={onTzChange} />
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            isPrimary
              ? "bg-mist-sage text-olive-ink"
              : "bg-surface-soft text-text-faint",
          )}
        >
          {title}
        </span>
      </div>

      {view ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xl font-medium leading-snug text-text">
              {view.human}
            </span>
            <span className="font-mono text-sm text-text-faint break-all">
              {view.iso8601}
              <span className="text-text-faint/75">
                {" "}
                · {view.abbreviation} {view.offset}
              </span>
            </span>
          </div>
          <dl className="flex items-center gap-6 border-t border-border-subtle pt-3 font-mono text-[12px] text-text-faint">
            <Meta k="Day" v={view.dayOfYear} />
            <Meta k="Week" v={view.weekOfYear} />
            <Meta k="Quarter" v={view.quarter} />
          </dl>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-text-faint">
          Enter a timestamp to begin.
        </p>
      )}
    </motion.div>
  );
}

function Meta({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-text-faint/70">{k}</dt>
      <dd className="text-text-muted">{v}</dd>
    </div>
  );
}
