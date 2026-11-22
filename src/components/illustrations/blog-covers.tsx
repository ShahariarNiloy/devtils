import type { ReactNode } from "react";
import type { CoverKey } from "@/lib/blog/types";
import { coverBlur } from "./blog-cover-blur";
import { coverCurl } from "./blog-cover-curl";
import { coverFormats } from "./blog-cover-formats";
import { coverKeys } from "./blog-cover-keys";
import { coverPng } from "./blog-cover-png";
import { coverTime } from "./blog-cover-time";
import { coverUrl } from "./blog-cover-url";
import { coverUuid } from "./blog-cover-uuid";
import { LineArt } from "./line-art";

/**
 * Blog cover drawings ("Blog cover" entries of the illustration board).
 * 240×140, cream strokes at 55/28/14% plus one clay accent, no motion.
 * Text fills keep the board's exact opacities.
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";
const T65 = "rgba(246,242,234,.65)";

/** Clock ticks for the cron cover, every 30°, r 36→46. */
const CRON_TICKS = [
  "M120.0 34.0L120.0 24.0",
  "M140.0 35.4L143.0 30.2",
  "M154.6 50.0L159.8 47.0",
  "M156.0 70.0L166.0 70.0",
  "M154.6 90.0L159.8 93.0",
  "M140.0 104.6L143.0 109.8",
  "M120.0 106.0L120.0 116.0",
  "M100.0 104.6L97.0 109.8",
  "M85.4 90.0L80.2 93.0",
  "M84.0 70.0L74.0 70.0",
  "M85.4 50.0L80.2 47.0",
  "M100.0 35.4L97.0 30.2",
];

const COVERS: Record<CoverKey, ReactNode> = {
  jwt: (
    <>
      <rect x="14" y="46" width="62" height="36" rx="18" stroke={S} />
      <text x="45" y="104" textAnchor="middle" fill={T45} fontSize="10">
        header
      </text>
      <rect x="88" y="46" width="82" height="36" rx="18" stroke={A} />
      <text x="129" y="104" textAnchor="middle" fill={A} fontSize="10">
        payload
      </text>
      <rect x="182" y="46" width="44" height="36" rx="18" stroke={M} strokeDasharray="4 5" />
      <text x="204" y="104" textAnchor="middle" fill={T45} fontSize="10">
        signature
      </text>
      <circle cx="82" cy="64" r="2.5" fill={S} stroke="none" />
      <circle cx="176" cy="64" r="2.5" fill={S} stroke="none" />
      <path d="M104 64h20M108 58h40M108 70h30" stroke={M} />
    </>
  ),
  json: (
    <>
      <path d="M70 22c-14 0-16 6-16 16v18c0 8-4 12-12 14c8 2 12 6 12 14v18c0 10 2 16 16 16" stroke={S} />
      <path d="M170 22c14 0 16 6 16 16v18c0 8 4 12 12 14c-8 2-12 6-12 14v18c0 10-2 16-16 16" stroke={S} />
      <path d="M84 50h50M92 70h40" stroke={M} />
      <text x="140" y="75" textAnchor="middle" fill={A} fontSize="22">
        ,
      </text>
      <path d="M137 96l5-8 5 8" stroke={A} />
    </>
  ),
  cron: (
    <>
      <circle cx="120" cy="70" r="50" stroke={S} />
      {CRON_TICKS.map((d) => (
        <path key={d} d={d} stroke={M} />
      ))}
      <path d="M120 20A50 50 0 0 1 163.3 45" stroke={A} strokeWidth="2.25" />
      <path d="M120 70V42M120 70l18 10" stroke={S} />
      <text x="198" y="128" textAnchor="middle" fill={T45} fontSize="10">
        */15
      </text>
    </>
  ),
  encoding: (
    <>
      {[
        [20, 31, "a"],
        [46, 57, "b"],
        [72, 83, "c"],
      ].map(([x, cx, ch]) => (
        <g key={ch}>
          <rect x={x} y="50" width="22" height="32" rx="6" stroke={S} />
          <text x={cx} y="71" textAnchor="middle" fill={T65} fontSize="12">
            {ch}
          </text>
        </g>
      ))}
      <path d="M106 66h28" stroke={A} />
      <path d="M126 58l8 8-8 8" stroke={A} />
      {[
        [144, 153, "Y"],
        [166, 175, "W"],
        [188, 197, "J"],
        [210, 219, "j"],
      ].map(([x, cx, ch]) => (
        <g key={ch}>
          <rect x={x} y="50" width="18" height="32" rx="5" stroke={M} />
          <text x={cx} y="71" textAnchor="middle" fill={T50} fontSize="11">
            {ch}
          </text>
        </g>
      ))}
      <path d="M20 100h70M144 100h84" stroke={F} />
    </>
  ),
  seo: (
    <>
      <circle cx="96" cy="70" r="44" stroke={S} />
      <ellipse cx="96" cy="70" rx="18" ry="44" stroke={M} />
      <path d="M52 70h88M60 48h72M60 92h72" stroke={M} />
      <path d="M142 70C160 70 160 34 178 34" stroke={F} />
      <rect x="178" y="23" width="40" height="22" rx="11" stroke={S} />
      <text x="198" y="38" textAnchor="middle" fill="var(--illus-text)" fontSize="10">
        en
      </text>
      <path d="M142 70C160 70 160 70 178 70" stroke={A} />
      <rect x="178" y="59" width="40" height="22" rx="11" stroke={A} />
      <text x="198" y="74" textAnchor="middle" fill={A} fontSize="10">
        ja
      </text>
      <path d="M142 70C160 70 160 106 178 106" stroke={F} />
      <rect x="178" y="95" width="40" height="22" rx="11" stroke={S} />
      <text x="198" y="110" textAnchor="middle" fill="var(--illus-text)" fontSize="10">
        bn
      </text>
    </>
  ),
  servers: (
    <>
      {[26, 56, 86].map((y) => (
        <g key={y}>
          <rect x="70" y={y} width="100" height="24" rx="7" stroke={M} />
          <circle cx="86" cy={y + 12} r="3" stroke={M} />
        </g>
      ))}
      <path d="M60 20L180 116M180 20L60 116" stroke={A} />
    </>
  ),
  bigfile: (
    <>
      <rect x="70" y="18" width="84" height="100" rx="10" stroke={F} />
      <rect x="62" y="26" width="84" height="100" rx="10" stroke={M} />
      <rect x="54" y="34" width="84" height="100" rx="10" stroke={S} />
      <path d="M66 48h48M66 60h36M66 72h44" stroke={M} />
      <rect x="54" y="96" width="84" height="8" rx="4" stroke={M} />
      <path d="M58 100h60" stroke={A} strokeWidth="3" />
      <text x="186" y="74" textAnchor="middle" fill={T50} fontSize="12">
        50 MB
      </text>
    </>
  ),
  url: coverUrl,
  png: coverPng,
  time: coverTime,
  uuid: coverUuid,
  blur: coverBlur,
  formats: coverFormats,
  keys: coverKeys,
  curl: coverCurl,
};

export function BlogCover({ cover, className }: { cover: CoverKey; className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className ?? "w-full"}>
      {COVERS[cover]}
    </LineArt>
  );
}
