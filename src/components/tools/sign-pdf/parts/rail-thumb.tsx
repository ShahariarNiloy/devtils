"use client";

import { memo, useEffect, useRef, useState } from "react";
import { pageThumbnail, type PDFDocumentProxy } from "../../pdf-shared/pdfjs";

/** Rail width minus padding, in CSS px. */
const THUMB_W = 84;

/** A small preview of one page, drawn the first time it scrolls into the rail. */
export const RailThumb = memo(function RailThumb({ pdf, index, aspect }: { pdf: PDFDocumentProxy; index: number; aspect: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let made: string | null = null;
    let live = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        void pdf
          .getPage(index + 1)
          .then((page) => pageThumbnail(page, THUMB_W))
          .then((u) => {
            made = u;
            if (live) setUrl(u);
            else URL.revokeObjectURL(u);
          })
          .catch(() => {
            /* keep the blank card */
          });
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
      if (made) URL.revokeObjectURL(made);
    };
  }, [pdf, index]);

  return (
    <span ref={ref} className="block w-full overflow-hidden rounded-sm bg-[#f4f1ea] shadow-[0_2px_8px_rgba(0,0,0,.35)]" style={{ aspectRatio: aspect }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="block size-full object-cover" />
      )}
    </span>
  );
});
