"use client";

import { Button } from "@/components/primitives/button";
import type { JsonFormatterState } from "../use-json-formatter";
import { RefreshCcw } from "lucide-react";

const BTN = "w-full justify-start gap-2 h-9 text-sm";

const S_GHOST: React.CSSProperties = {
  background: "var(--btn-ghost-bg)",
  color: "var(--btn-ghost-text)",
  borderColor: "var(--btn-ghost-border)",
};

type RepairControlsProps = Pick<
  JsonFormatterState,
  "repair" | "repairLog" | "repairError"
>;

export function RepairControls({ repair, repairLog, repairError }: RepairControlsProps) {
  return (
    <>
      {/* Repair / Fix */}
      <Button
        variant="secondary"
        size="sm"
        className={BTN}
        style={S_GHOST}
        onClick={repair}
      >
        <RefreshCcw size={14} />
        Repair / Fix
      </Button>

      {/* Repair log */}
      {repairLog.length > 0 && (
        <div className="rounded-lg bg-success/10 border border-success/20 px-2 py-2 text-sm text-success space-y-1">
          <p className="font-medium">
            &#x2713; Fixed {repairLog.length} issue
            {repairLog.length !== 1 ? "s" : ""}:
          </p>
          <ul className="space-y-0.5 pl-1">
            {repairLog.map((item, i) => (
              <li key={i} className="text-text-muted">
                &bull; {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Repair error */}
      {repairError && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-2 py-2 text-sm text-danger">
          {repairError}
        </div>
      )}
    </>
  );
}
