/**
 * "Copy tag" — an <img> snippet for a compressed result. Pure.
 *
 * Width/height attributes reserve the box before the image loads (no layout
 * shift); lazy loading + async decoding keep below-the-fold images off the
 * critical path. The alt text is a placeholder to replace — an empty alt
 * would mark the image decorative, which is rarely what's meant.
 */

export const IMG_SRC_PREFIX = "/images/";
export const ALT_PLACEHOLDER = "Describe the image";

function attr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function imgSnippet(opts: { fileName: string; width: number; height: number; alt?: string; prefix?: string }): string {
  const src = `${opts.prefix ?? IMG_SRC_PREFIX}${opts.fileName}`;
  return [
    "<img",
    `  src="${attr(src)}"`,
    `  width="${Math.round(opts.width)}" height="${Math.round(opts.height)}"`,
    `  alt="${attr(opts.alt ?? ALT_PLACEHOLDER)}"`,
    `  loading="lazy"`,
    `  decoding="async"`,
    ">",
  ].join("\n");
}
