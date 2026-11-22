"use client";

import { useEffect, useRef } from "react";

type Point = readonly [x: number, y: number];

// Must match the floor's CSS in hero-keyfield.tsx.
const PERSPECTIVE = 900; // perspective(900px)
const SIN = Math.sin(Math.PI / 3); // rotateX(60deg)
const COS = Math.cos(Math.PI / 3);
const FLOOR_TOP_FROM_BOTTOM = 380; // top: calc(100% - 380px)
const BOTTOM_FADE = 300; // h-[300px] fade, opaque from 62%

/** Half the lit key's diagonal (62px square rotated 45°) plus its 10px glow. */
const KEY_RADIUS = 31 * Math.SQRT2 + 10;

/**
 * Floor point → screen offset from the floor's origin (top-centre) after the
 * 3D tilt, plus the key's on-screen half-width and half-height there.
 */
function project([x, y]: Point): [
  dx: number,
  dy: number,
  rx: number,
  ry: number,
] {
  const s = PERSPECTIVE / (PERSPECTIVE - y * SIN);
  return [(x - 1000) * s, y * COS * s, KEY_RADIUS * s, KEY_RADIUS * COS * s];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** How visible a floor key is through the side mask, floor mask and bottom fade (0–1). */
function visibility(
  p: Point,
  sx: number,
  sy: number,
  w: number,
  h: number,
): number {
  // Each mask is a piecewise-linear ramp; `clamp01` keeps it in 0–1.
  const fx = sx / w;
  const side = Math.min(
    clamp01((fx - 0.04) / 0.24),
    clamp01((0.96 - fx) / 0.24),
  );
  const fy = p[1] / 900;
  const floor = Math.min(
    0.6 + 2 * Math.min(fy, 0.2),
    clamp01((0.85 - fy) / 0.3),
  );
  const fade = clamp01(1 - (sy - (h - BOTTOM_FADE)) / (BOTTOM_FADE * 0.62));
  return side * floor * fade;
}

/**
 * The hero floor's single clay key (it echoes the logo's warm key). Each 6 s
 * pulse fades in and out on one key; while fully dark (the cycle boundary)
 * it hops to another random key, so the glow wanders without ever being seen
 * to jump.
 *
 * It only visits keys that are clearly visible on *this* screen and not
 * behind the hero's text or buttons: positions are projected through the
 * same perspective as the CSS once on mount and on resize — pure maths, no
 * layout reads per key. The hop is a `transform` and the pulse `opacity`
 * (compositor-only). Reduced motion stops the CSS animation, so no
 * iteration events fire and the key rests at `home`.
 */
export function HeroLitKey({
  home,
  keys,
}: {
  home: Point;
  keys: readonly Point[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pool = useRef<Point[]>([]);
  const last = useRef<Point>(home);

  const hop = () => {
    const el = ref.current;
    const options = pool.current.filter((k) => k !== last.current);
    if (!el || options.length === 0) return;
    const next = options[Math.floor(Math.random() * options.length)];
    last.current = next;
    el.style.transform = `translate(${next[0] - home[0]}px, ${next[1] - home[1]}px)`;
  };

  useEffect(() => {
    const el = ref.current;
    const field = el?.closest<HTMLElement>("[data-keyfield]");
    const hero = el?.closest("section");
    if (!el || !field || !hero) return;

    const compute = () => {
      const f = field.getBoundingClientRect();
      const ox = f.left + f.width / 2;
      const oy = f.top + f.height - FLOOR_TOP_FROM_BOTTOM;
      // Text and buttons the glow must never sit behind. Text uses its real
      // line boxes (a <p>'s own box can span the whole width).
      const avoid: DOMRect[] = [];
      for (const n of hero.querySelectorAll("h1, p, a")) {
        if (n.tagName === "A") {
          avoid.push(n.getBoundingClientRect());
        } else {
          const range = document.createRange();
          range.selectNodeContents(n);
          avoid.push(...Array.from(range.getClientRects()));
        }
      }
      const pick = (minVisible: number, pad: number) =>
        keys.filter((k) => {
          const [dx, dy, rx, ry] = project(k);
          const sx = ox + dx;
          const sy = oy + dy;
          if (
            visibility(k, sx - f.left, sy - f.top, f.width, f.height) <
            minVisible
          )
            return false;
          // The whole key (not just its centre) stays clear of text and buttons.
          return !avoid.some(
            (r) =>
              sx + rx > r.left - pad &&
              sx - rx < r.right + pad &&
              sy + ry > r.top - pad &&
              sy - ry < r.bottom + pad,
          );
        });
      // Strict first; on small screens only a thin strip of floor shows, so
      // relax step by step until there are a few keys to wander between.
      // (Only the margin and visibility relax — never overlap with text.)
      let next: Point[] = [];
      for (const [minVisible, pad] of [
        [0.6, 28],
        [0.45, 18],
        [0.3, 10],
      ] as const) {
        next = pick(minVisible, pad);
        if (next.length >= 4) break;
      }
      pool.current = next;
      el.dataset.pool = String(next.length);
      // No key is both visible and clear of the text: show nothing rather
      // than pulse somewhere off-screen or behind a button.
      el.hidden = next.length === 0;
    };
    compute();
    // The animation starts fully dark, so moving now is invisible: the very
    // first pulse already lands on a visible key. (Reduced motion: stay home.)
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) hop();
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(compute, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hop only reads refs
  }, [keys]);

  return (
    // A plain <div> carries the animation: Chrome hands opacity/transform
    // on an HTML layer to the compositor, but not on an <svg> element.
    <div
      ref={ref}
      aria-hidden="true"
      className="hero-key-lit absolute size-[120px]"
      style={{ left: home[0] - 60, top: home[1] - 60 }}
      onAnimationIteration={hop}
    >
      <svg
        viewBox="-60 -60 120 120"
        width="120"
        height="120"
        className="block overflow-visible"
      >
        <rect
          x="-31"
          y="-31"
          width="62"
          height="62"
          rx="13"
          transform="rotate(45)"
          fill="#e0a072"
          fillOpacity=".85"
          style={{ filter: "drop-shadow(0 0 10px rgba(224,160,114,.7))" }}
        />
      </svg>
    </div>
  );
}
