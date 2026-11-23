"use client";

import { cn } from "@/lib/cn";

/**
 * Presentational previews for the SEO family (used by Meta preview and the
 * Open Graph generator). They only lay out what they're given — measuring
 * and truncation belong in the tool's lib.
 *
 * The SERP card deliberately keeps light, search-result colours in both
 * themes: it imitates a results page, not our UI.
 */

interface SerpCardProps {
  /** Site name line ("utilyx"). */
  site: string;
  /** Breadcrumb URL line ("https://utilyx.dev › tools › json-formatter"). */
  crumb: string;
  /** Favicon stand-in letter. */
  initial: string;
  /** Title, already truncated by the caller if needed. */
  title: string;
  /** Description, already truncated by the caller if needed. */
  desc: string;
  /** Result column width in px (desktop ≈ 600, mobile ≈ 360). */
  width: number;
  /** Title font size in px (desktop 20, mobile 18). */
  titleSize?: number;
  /** The site's real favicon, when known; else the initial letter. */
  icon?: string;
}

export function SeoSerpCard({ site, crumb, initial, title, desc, width, titleSize = 20, icon }: SerpCardProps) {
  return (
    <div
      className="mx-3.5 mt-3 box-border rounded-[14px] bg-[#f6f2ea] p-[18px] text-[#1a1a18]"
      style={{ maxWidth: width }}
    >
      <div className="mb-1.5 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e3ded2] text-xs font-bold text-[#5a615a]"
        >
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element -- the checked site's favicon
            <img src={icon} alt="" referrerPolicy="no-referrer" className="size-[18px] object-contain" />
          ) : (
            initial
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm [overflow-wrap:anywhere] text-[#1a1a18]">{site}</span>
          <span className="text-xs break-all text-[#5a615a]">{crumb}</span>
        </span>
      </div>
      <div className="leading-[1.3] [overflow-wrap:anywhere] text-[#2a4fa8]" style={{ fontSize: titleSize }}>
        {title}
      </div>
      <div className="mt-1 text-sm leading-[1.55] [overflow-wrap:anywhere] text-[#3d4435]">{desc}</div>
    </div>
  );
}

interface SocialCardsProps {
  /** Mono label on the image area ("og:image · 1200×630"). */
  imgLabel: string;
  domain: string;
  title: string;
  /** Shorter title for the compact card. */
  titleShort: string;
  desc: string;
  /** Image to show: the og:image URL, or a local preview's object URL. */
  image?: string;
  /** Large card (1.91:1) or small card (square). */
  large: boolean;
  /** Reports the loaded image's real size, or that it failed. */
  onProbe?: (src: string, probe: { state: "ok"; w: number; h: number } | { state: "error" }) => void;
  /** Current state of `image`, as reported through `onProbe`. */
  status: "none" | "loading" | "ok" | "error";
}

const NO_IMAGE = "flex items-center justify-center bg-[#121211] text-center text-[12px] text-text-faint";

/** The share image, cropped from the centre the way Facebook, X and LinkedIn crop it. */
function CardImage({ image, status, onProbe, className }: Pick<SocialCardsProps, "image" | "status" | "onProbe"> & { className: string }) {
  if (!image) return <div className={cn(NO_IMAGE, className)}>No image</div>;
  return (
    <div className={cn("relative overflow-hidden bg-[#121211]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- any URL the user types, measured on load */}
      <img
        key={image}
        src={image}
        alt=""
        // Don't tell the image's host which page is previewing it.
        referrerPolicy="no-referrer"
        // A cached image can finish before React attaches onLoad; catch it here.
        ref={(el) => {
          if (!el?.complete) return;
          if (el.naturalWidth) onProbe?.(image, { state: "ok", w: el.naturalWidth, h: el.naturalHeight });
          else onProbe?.(image, { state: "error" });
        }}
        onLoad={(e) => onProbe?.(image, { state: "ok", w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onError={() => onProbe?.(image, { state: "error" })}
        className={cn("absolute inset-0 size-full object-cover transition-opacity", status === "ok" ? "opacity-100" : "opacity-0")}
      />
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-white/[.04]" />}
      {status === "error" && <div className={cn(NO_IMAGE, "absolute inset-0 px-3 text-[#f0a892]")}>Image didn&apos;t load</div>}
    </div>
  );
}

/**
 * Share-card previews with the real image: a large 1.91:1 card (or a small
 * square-image card) plus the compact link preview chat apps show.
 */
export function SeoSocialCards({ imgLabel, domain, title, titleShort, desc, image, large, onProbe, status }: SocialCardsProps) {
  return (
    <div className="mx-3.5 mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
      {large ? (
        <div className="overflow-hidden rounded-[14px] border border-white/12 bg-[#181816]">
          <div className="relative">
            <CardImage image={image} status={status} onProbe={onProbe} className="aspect-[1.91/1]" />
            {status === "ok" && (
              <span className="absolute bottom-2.5 left-2.5 rounded-[5px] bg-black/60 px-[7px] py-0.5 font-mono text-[11px] text-text-key">{imgLabel}</span>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-[3px] px-3.5 py-3 [overflow-wrap:anywhere]">
            <span className="text-[11px] text-text-faint lowercase">{domain}</span>
            <span className="text-[15px] leading-[1.3] font-bold">{title}</span>
            <span className="text-[13px] leading-[1.45] text-text-tertiary">{desc}</span>
          </div>
        </div>
      ) : null}
      <div className="flex self-start overflow-hidden rounded-[14px] border border-white/12 bg-[#181816]">
        <CardImage image={image} status={status} onProbe={large ? undefined : onProbe} className="min-h-24 flex-[0_0_96px]" />
        <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 [overflow-wrap:anywhere]">
          <span className="text-[11px] text-text-faint">{domain}</span>
          <span className="text-sm leading-[1.3] font-bold">{titleShort}</span>
          <span className="text-xs text-text-tertiary">{large ? "Compact link preview" : desc}</span>
        </div>
      </div>
    </div>
  );
}
