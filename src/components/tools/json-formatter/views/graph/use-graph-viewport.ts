"use client";

import { useCallback, useEffect, useRef } from "react";

interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/**
 * Pan/zoom for the graph. The transform is applied imperatively to the
 * `<g>` (no React state, no per-move re-render of hundreds of nodes) —
 * panning/zooming never touches the React tree, only one attribute.
 */
export function useGraphViewport() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const view = useRef<Viewport>({ scale: 1, tx: 0, ty: 0 });

  const apply = useCallback(() => {
    const g = groupRef.current;
    if (!g) return;
    const { tx, ty, scale } = view.current;
    g.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
  }, []);

  const zoomAt = useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = clientX - r.left;
      const py = clientY - r.top;
      const old = view.current.scale;
      const ns = clampScale(old * factor);
      if (ns === old) return;
      view.current.tx = px - (px - view.current.tx) * (ns / old);
      view.current.ty = py - (py - view.current.ty) * (ns / old);
      view.current.scale = ns;
      apply();
    },
    [apply],
  );

  const zoomByCenter = useCallback(
    (factor: number) => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      zoomAt(factor, r.left + r.width / 2, r.top + r.height / 2);
    },
    [zoomAt],
  );

  const zoomIn = useCallback(() => zoomByCenter(1.25), [zoomByCenter]);
  const zoomOut = useCallback(() => zoomByCenter(1 / 1.25), [zoomByCenter]);

  /** Fit the given content bounds into the viewport, centered. */
  const fit = useCallback(
    (contentW: number, contentH: number) => {
      const el = svgRef.current;
      if (!el || contentW <= 0 || contentH <= 0) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const s = clampScale(
        Math.min(r.width / contentW, r.height / contentH) * 0.9,
      );
      view.current.scale = s;
      view.current.tx = (r.width - contentW * s) / 2;
      view.current.ty = (r.height - contentH * s) / 2;
      apply();
    },
    [apply],
  );

  // Native listeners (wheel must be non-passive to preventDefault zoom).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
    };

    let dragging = false;
    let start = { x: 0, y: 0, tx: 0, ty: 0 };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      start = {
        x: e.clientX,
        y: e.clientY,
        tx: view.current.tx,
        ty: view.current.ty,
      };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      view.current.tx = start.tx + (e.clientX - start.x);
      view.current.ty = start.ty + (e.clientY - start.y);
      apply();
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [apply, zoomAt]);

  return { svgRef, groupRef, fit, zoomIn, zoomOut };
}
