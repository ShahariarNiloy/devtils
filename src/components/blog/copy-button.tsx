"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "failed";

const LABEL: Record<State, string> = { idle: "Copy", copied: "Copied", failed: "Couldn't copy" };
const ANNOUNCE: Record<State, string> = {
  idle: "",
  copied: "Code copied to clipboard",
  failed: "Couldn't copy the code",
};

/**
 * Copy button for a post's code block — one of the two client islands on a
 * post page. The visible label flips to "Copied" and a polite live region
 * announces the result for screen readers.
 */
export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let next: State = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = "failed";
    }
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="-my-1 -mr-1.5 cursor-pointer rounded-md px-1.5 py-1 text-text-faint transition-colors hover:text-text"
      >
        {LABEL[state]}
        {state === "idle" && <span className="sr-only"> code</span>}
      </button>
      <span aria-live="polite" className="sr-only">
        {ANNOUNCE[state]}
      </span>
    </>
  );
}
