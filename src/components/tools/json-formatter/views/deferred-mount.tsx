"use client";

import { useEffect, useState } from "react";

interface DeferredMountProps {
  /** When this changes, re-defer (paint the loader, then remount content). */
  token: unknown;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function ViewLoader() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-text-faint">
      <span className="animate-pulse">Rendering…</span>
    </div>
  );
}

/**
 * Paints `fallback` first, then mounts `children` on a later frame. The heavy
 * view (Tree / Code / Path) builds in its own commit *after* the loader is on
 * screen, so a big-document view switch shows a loader instead of a frozen
 * tab. A plain spinner can't do this — the work would block the same commit
 * the spinner is in and never paint.
 */
export function DeferredMount({
  token,
  children,
  fallback,
}: DeferredMountProps) {
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(token);

  if (shown !== token) {
    setShown(token);
    setReady(false);
  }

  useEffect(() => {
    if (ready) return;
    let inner = 0;
    // Two frames: one to paint the fallback, one to commit the heavy child.
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [ready]);

  return ready ? <>{children}</> : <>{fallback ?? <ViewLoader />}</>;
}
