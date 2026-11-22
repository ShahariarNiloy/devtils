"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageInfo } from "../pdf-shared/pdf-ops.types";
import { runPdfJob } from "../pdf-shared/pdf-ops";
import { ThumbStore } from "../pdf-shared/thumb-store";

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  /** Extra turn the user added, in degrees clockwise. */
  rotate: number;
  /** Format and upright size; null while it's being read. */
  info: ImageInfo | null;
}

/** Previews are drawn once at this size and scaled by CSS. */
const THUMB_PX = 520;
/** Images read at once — each read decodes (a cheap, shrunken decode where possible). */
const READERS = 2;

const IMAGE_EXT = /\.(jpe?g|jfif|png|gif|webp|heic|heif|avif|bmp)$/i;
export const isImageFile = (f: File) =>
  f.type.startsWith("image/") || IMAGE_EXT.test(f.name);

let nextId = 0;

export function useImageToPdf() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [thumbs] = useState(() => new ThumbStore());
  const queue = useRef<ImageItem[]>([]);
  const running = useRef(0);
  const alive = useRef(new Set<string>());

  useEffect(() => () => thumbs.drop(() => true), [thumbs]);

  // One reader works through the queue; up to READERS run side by side.
  const read = useCallback(async () => {
    running.current++;
    try {
      for (
        let item = queue.current.shift();
        item;
        item = queue.current.shift()
      ) {
        if (!alive.current.has(item.id)) continue;
        const it = item;
        try {
          const { outputs, image } = await runPdfJob({
            kind: "image-info",
            blob: it.file,
            name: it.name,
            thumbPx: THUMB_PX,
          });
          if (!alive.current.has(it.id) || !image) continue;
          thumbs.set(
            it.id,
            URL.createObjectURL(
              new Blob([outputs[0] as Uint8Array<ArrayBuffer>], {
                type: "image/jpeg",
              }),
            ),
          );
          setItems((xs) =>
            xs.map((x) => (x.id === it.id ? { ...x, info: image } : x)),
          );
        } catch (e) {
          alive.current.delete(it.id);
          setItems((xs) => xs.filter((x) => x.id !== it.id));
          setProblems((p) => [
            ...p,
            e instanceof Error ? e.message : `“${it.name}” couldn't be read.`,
          ]);
        }
      }
    } finally {
      running.current--;
    }
  }, [thumbs]);

  // Each read() takes its first item before its first await, so this starts
  // exactly as many readers as there's work for.
  const pump = useCallback(() => {
    while (running.current < READERS && queue.current.length) void read();
  }, [read]);

  const add = useCallback(
    (files: readonly File[]) => {
      const fresh: ImageItem[] = [];
      const skipped: string[] = [];
      for (const file of files) {
        if (!isImageFile(file)) {
          skipped.push(
            file.type === "application/pdf"
              ? `“${file.name}” is a PDF — use Merge PDF to combine PDFs.`
              : `“${file.name}” isn't an image.`,
          );
          continue;
        }
        const id = `i${++nextId}`;
        alive.current.add(id);
        fresh.push({
          id,
          file,
          name: file.name || `pasted-${nextId}.png`,
          rotate: 0,
          info: null,
        });
      }
      setProblems(skipped);
      if (!fresh.length) return;
      setItems((xs) => [...xs, ...fresh]);
      queue.current.push(...fresh);
      pump();
    },
    [pump],
  );

  const remove = useCallback(
    (id: string) => {
      alive.current.delete(id);
      thumbs.drop((k) => k === id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    },
    [thumbs],
  );

  const rotate = useCallback(
    (id: string) =>
      setItems((xs) =>
        xs.map((x) =>
          x.id === id ? { ...x, rotate: (x.rotate + 90) % 360 } : x,
        ),
      ),
    [],
  );

  const clear = useCallback(() => {
    alive.current.clear();
    queue.current = [];
    thumbs.drop(() => true);
    setItems([]);
    setProblems([]);
  }, [thumbs]);

  return {
    items,
    setItems,
    problems,
    setProblems,
    thumbs,
    add,
    remove,
    rotate,
    clear,
  };
}
