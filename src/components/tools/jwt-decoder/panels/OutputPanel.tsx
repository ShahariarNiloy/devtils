"use client";

import { HeaderView } from "../views/HeaderView";
import { PayloadView } from "../views/PayloadView";
import type { JwtDecoderState } from "../useJwtDecoder";

/** Right column of the top row — the decoded Header + Payload only. */
export function OutputPanel({ state }: { state: JwtDecoderState }) {
  const { jwt } = state;

  if (!jwt) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center text-sm text-text-faint">
        Paste a valid JWT to see the decoded header and payload.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HeaderView jwt={jwt} />
      <PayloadView jwt={jwt} warnings={state.warnings} />
    </div>
  );
}
