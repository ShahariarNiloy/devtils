import { NoDifferences } from "@/components/illustrations/no-differences";
import { ReadyForInput } from "@/components/illustrations/ready-for-input";

/** Identical documents. */
export function NoDiffState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <NoDifferences className="w-40" />
      <span className="text-base font-bold">No differences</span>
      <span className="max-w-[360px] text-sm text-text-tertiary">
        The two documents hold the same data. Key order and formatting don&rsquo;t count.
      </span>
    </div>
  );
}

/** A side is empty or invalid. */
export function WaitingState({ message, onJump, jumpLabel }: { message: string; onJump?: () => void; jumpLabel?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <ReadyForInput className="w-[150px]" />
      <span className="text-base font-bold">{message}</span>
      <span className="max-w-[380px] text-sm text-text-tertiary">The diff appears as soon as both sides are valid JSON.</span>
      {onJump && (
        <button
          type="button"
          onClick={onJump}
          className="mt-1 min-h-11 cursor-pointer rounded-lg px-3 text-[13px] font-semibold text-error-text underline decoration-error-text/40 underline-offset-2 hover:decoration-error-text sm:min-h-8"
        >
          {jumpLabel ?? "Jump to the error"}
        </button>
      )}
    </div>
  );
}

/** Both parsed, but the compare itself failed (nesting too deep…). */
export function FailedState({ message }: { message: string }) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="text-base font-bold text-error-text">{message}</span>
      <span className="max-w-[380px] text-sm text-text-tertiary">Flatten the input or compare a smaller part of it.</span>
    </div>
  );
}
