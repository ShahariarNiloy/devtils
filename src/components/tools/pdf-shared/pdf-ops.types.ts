/** Jobs the PDF worker understands. Coordinates are PDF points. */

import type { ImageType } from "./image-probe.lib";
import type { LayoutOpts, SizeMode } from "./image-layout.lib";

export interface MergeJob {
  kind: "merge";
  files: { id: string; bytes: ArrayBuffer }[];
  /** Output order; `rotate` is added to the page's own rotation (90° steps). */
  pages: { file: string; index: number; rotate: number }[];
}

/**
 * A box on a page in PDF user space: (x, y) is the corner that is bottom-left
 * *as the reader sees it*, w/h run along the visual axes, and `rotate` (°,
 * counter-clockwise) turns content upright on pages with /Rotate.
 */
export interface Box {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
}

export type SignItem =
  | (Box & { kind: "image"; png: ArrayBuffer })
  | (Box & { kind: "text"; text: string; color: [number, number, number] })
  | (Box & { kind: "check"; color: [number, number, number] });

export interface SignJob {
  kind: "sign";
  bytes: ArrayBuffer;
  items: SignItem[];
}

export interface SplitJob {
  kind: "split";
  bytes: ArrayBuffer;
  /** One output PDF per group; each group is 0-based page indices in order. */
  groups: number[][];
}

export interface CompressJob {
  kind: "compress";
  bytes: ArrayBuffer;
  /** JPEG quality, 0–1. */
  quality: number;
  /** Longest image side after downscaling, in pixels. */
  maxPx: number;
  /** Also turn lossless photo-like images into JPEG. */
  photosFromLossless: boolean;
  /** Images re-encoded at once (default 4). */
  concurrency?: number;
}

export interface CompressStats {
  images: number;
  recompressed: number;
  /** Left alone so their colours can't shift (CMYK, colour-profiled grey, unusual colour spaces). */
  keptForColour: number;
  /** Already as small as we could make them, or not photos. */
  keptAsIs: number;
  /** Uncompressed streams (page text, drawings) we deflated. */
  streamsDeflated: number;
}

/**
 * Images → one PDF, a page each. Images travel as Blobs, which cross to the
 * worker by reference — nothing is copied.
 */
export interface ImagesJob {
  kind: "images";
  images: { blob: Blob; name: string; rotate: number }[];
  layout: LayoutOpts;
  mode: SizeMode;
}

/** Read an image's format and upright size, and draw a small preview. */
export interface ImageInfoJob {
  kind: "image-info";
  blob: Blob;
  name: string;
  /** Longest side of the preview, in pixels. */
  thumbPx: number;
}

export type PdfJob = MergeJob | SignJob | SplitJob | CompressJob | ImagesJob | ImageInfoJob;

export interface ImageInfo {
  type: ImageType;
  w: number;
  h: number;
}

export interface PdfJobResult {
  outputs: Uint8Array[];
  stats?: CompressStats;
  /** For image-info: the image's facts; `outputs[0]` is its JPEG preview. */
  image?: ImageInfo;
}

export type PdfJobReply =
  | ({ id: number; ok: true } & PdfJobResult)
  | { id: number; ok: false; error: string }
  /** Sent while a long job runs: `done` of `total` steps finished. */
  | { id: number; progress: { done: number; total: number } };
