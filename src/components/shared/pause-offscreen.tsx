"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pauses every CSS animation inside while it's off-screen. Some animations
 * (e.g. the illustrations' `stroke-dashoffset` flow) can't run on the
 * compositor, so the browser ticks them on the main thread every frame even
 * when nobody can see them — ~8% of a core on the landing, measured. The
 * wrapper is `display: contents`, so it adds no box and changes no layout.
 */
export function PauseOffscreen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const set = (visible: boolean) =>
      host.toggleAttribute("data-offscreen", !visible);
    // `display: contents` has no box to observe, so watch its children.
    const targets = Array.from(host.children);
    const shown = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) shown.add(e.target);
          else shown.delete(e.target);
        }
        set(shown.size > 0);
      },
      { rootMargin: "200px 0px" },
    );
    for (const t of targets) io.observe(t);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="contents" data-offscreen="">
      {children}
    </div>
  );
}
