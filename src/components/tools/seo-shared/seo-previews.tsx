"use client";

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
}

export function SeoSerpCard({ site, crumb, initial, title, desc, width, titleSize = 20 }: SerpCardProps) {
  return (
    <div
      className="mx-3.5 mt-3 box-border rounded-[14px] bg-[#f6f2ea] p-[18px] text-[#1a1a18]"
      style={{ maxWidth: width }}
    >
      <div className="mb-1.5 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-[26px] items-center justify-center rounded-full bg-[#e3ded2] text-xs font-bold text-[#5a615a]"
        >
          {initial}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm text-[#1a1a18]">{site}</span>
          <span className="text-xs break-all text-[#5a615a]">{crumb}</span>
        </span>
      </div>
      <div className="leading-[1.3] text-[#2a4fa8]" style={{ fontSize: titleSize }}>
        {title}
      </div>
      <div className="mt-1 text-sm leading-[1.55] text-[#3d4435]">{desc}</div>
    </div>
  );
}

interface SocialCardsProps {
  /** Mono label on the image area ("og.png · 1200 × 630"). */
  imgLabel: string;
  domain: string;
  title: string;
  /** Shorter title for the compact card. */
  titleShort: string;
  desc: string;
}

/**
 * Large share card + compact link card. The image area is a gradient
 * placeholder: the tool never fetches the og:image URL.
 */
export function SeoSocialCards({ imgLabel, domain, title, titleShort, desc }: SocialCardsProps) {
  return (
    <div className="mx-3.5 mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
      <div className="overflow-hidden rounded-[14px] border border-white/12 bg-[#181816]">
        <div
          role="img"
          aria-label="Share image placeholder, 1200 by 630"
          className="box-border flex aspect-[1.91/1] items-end bg-[radial-gradient(60%_80%_at_30%_40%,rgba(224,160,114,.55),rgba(224,160,114,0)_70%),radial-gradient(50%_70%_at_80%_70%,rgba(111,166,175,.45),rgba(111,166,175,0)_70%),#121211] p-2.5"
        >
          <span className="rounded-[5px] bg-black/45 px-[7px] py-0.5 font-mono text-[11px] text-text-key">{imgLabel}</span>
        </div>
        <div className="flex flex-col gap-[3px] px-3.5 py-3">
          <span className="text-[11px] text-text-faint lowercase">{domain}</span>
          <span className="text-[15px] leading-[1.3] font-bold">{title}</span>
          <span className="text-[13px] leading-[1.45] text-text-tertiary">{desc}</span>
        </div>
      </div>
      <div className="flex self-start overflow-hidden rounded-[14px] border border-white/12 bg-[#181816]">
        <div
          aria-hidden="true"
          className="min-h-24 flex-[0_0_96px] bg-[radial-gradient(60%_80%_at_40%_40%,rgba(224,160,114,.55),rgba(224,160,114,0)_70%),#121211]"
        />
        <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
          <span className="text-[11px] text-text-faint">{domain}</span>
          <span className="text-sm leading-[1.3] font-bold break-words">{titleShort}</span>
          <span className="text-xs text-text-tertiary">Compact link preview</span>
        </div>
      </div>
    </div>
  );
}
