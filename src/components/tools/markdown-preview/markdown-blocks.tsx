import { Check, ImageOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isLocalImage, type Align, type Block, type Inline } from "./markdown-preview.lib";

/**
 * Renders the Markdown AST as React elements — no innerHTML, so pasted
 * content can never execute. Remote images are not fetched (the tool makes
 * no network requests); they show as a labelled placeholder instead.
 */

const HEADING: Record<number, string> = {
  1: "mb-0.5 border-b border-white/8 pb-2 text-[28px]",
  2: "mt-2.5 text-[21px]",
  3: "mt-2.5 text-[17px]",
  4: "mt-2 text-[15px]",
  5: "mt-2 text-[14px]",
  6: "mt-2 text-[13px] text-text-muted",
};

function InlineNodes({ nodes }: { nodes: readonly Inline[] }) {
  return <>{nodes.map((n, i) => renderInline(n, i))}</>;
}

function renderInline(n: Inline, key: number): ReactNode {
  switch (n.kind) {
    case "text":
      return n.text;
    case "break":
      return <br key={key} />;
    case "code":
      return (
        <code key={key} className="rounded bg-white/7 px-[5px] py-px font-mono text-[0.88em] text-clay-cream">
          {n.text}
        </code>
      );
    case "strong":
      return (
        <strong key={key} className="font-bold text-text">
          <InlineNodes nodes={n.children} />
        </strong>
      );
    case "em":
      return (
        <em key={key} className="italic">
          <InlineNodes nodes={n.children} />
        </em>
      );
    case "del":
      return (
        <del key={key} className="text-text-faint">
          <InlineNodes nodes={n.children} />
        </del>
      );
    case "link":
      if (n.href === null) {
        return (
          <span key={key} title="Link removed: unsafe URL scheme" className="text-text-muted">
            <InlineNodes nodes={n.children} />
          </span>
        );
      }
      return (
        <a
          key={key}
          href={n.href}
          title={n.title ?? undefined}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-clay-light underline underline-offset-2 hover:text-clay-cream"
        >
          <InlineNodes nodes={n.children} />
        </a>
      );
    case "image":
      if (isLocalImage(n.src)) {
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied data: URI, not an optimisable asset
        return <img key={key} src={n.src} alt={n.alt} title={n.title ?? undefined} className="inline-block max-w-full rounded-md" />;
      }
      return (
        <span
          key={key}
          title={n.src ? `Not loaded: ${n.src}` : "Image removed: unsafe source"}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-white/4 px-2 py-0.5 align-middle text-[0.85em] text-text-faint"
        >
          <ImageOff size={13} aria-hidden className="shrink-0" />
          <span className="truncate">{n.alt || "image"}</span>
          <span className="sr-only">(remote image, not loaded)</span>
        </span>
      );
  }
}

const ALIGN_CLASS: Record<"left" | "center" | "right", string> = { left: "text-left", center: "text-center", right: "text-right" };
const alignClass = (a: Align) => ALIGN_CLASS[a ?? "left"];

function BlockNode({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      const Tag = `h${block.level}` as const;
      return (
        <Tag className={cn("m-0 font-sans leading-[1.2] font-bold tracking-[-0.02em] text-text", HEADING[block.level])}>
          <InlineNodes nodes={block.inline} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="m-0">
          <InlineNodes nodes={block.inline} />
        </p>
      );
    case "quote":
      return (
        <blockquote className="m-0 flex flex-col gap-3 border-l-[3px] border-accent py-1 pl-3.5 text-text-muted">
          <Blocks blocks={block.blocks} />
        </blockquote>
      );
    case "code":
      return (
        <pre className="m-0 rounded-[10px] border border-white/7 bg-[#0d0d0c] p-3.5 font-mono text-[13px] leading-[1.7] break-words whitespace-pre-wrap text-clay-cream">
          <code>{block.text}</code>
        </pre>
      );
    case "hr":
      return <hr className="my-1.5 w-full border-0 border-t border-white/10" />;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className="m-0 flex list-none flex-col gap-1 p-0" start={block.ordered ? block.start : undefined}>
          {block.items.map((it, i) => {
            const [head, ...rest] = it.blocks;
            const lead = head?.kind === "paragraph" ? head : null;
            const tail = lead ? rest : it.blocks;
            return (
              <li key={i} className="flex gap-2.5">
                {/* Marker column: one line-height tall so it centres on the first line. */}
                <span aria-hidden className="flex h-[1.65em] shrink-0 basis-[18px] items-center">
                  {it.task !== null ? (
                    <span
                      className={cn(
                        "flex size-[15px] items-center justify-center rounded-[4px] border",
                        it.task ? "border-clay-light bg-clay-light text-on-brand" : "border-white/30",
                      )}
                    >
                      {it.task && <Check size={11} strokeWidth={3} />}
                    </span>
                  ) : block.ordered ? (
                    <span className="font-mono text-[13px] text-clay-light">{block.start + i}.</span>
                  ) : (
                    <span className="ml-1 size-1.5 rounded-full bg-clay-light" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  {it.task !== null && <span className="sr-only">{it.task ? "Done:" : "To do:"}</span>}
                  {lead && (
                    <span>
                      <InlineNodes nodes={lead.inline} />
                    </span>
                  )}
                  {tail.length > 0 && <Blocks blocks={tail} />}
                </span>
              </li>
            );
          })}
        </Tag>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-[10px] border border-white/7">
          <table className="w-full border-collapse text-[14px]">
            <thead className="bg-white/4">
              <tr>
                {block.head.map((h, c) => (
                  <th key={c} className={cn("border-b border-white/7 px-3 py-2 font-bold text-text", alignClass(block.align[c]))}>
                    <InlineNodes nodes={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, ri) => (
                <tr key={ri} className="border-b border-white/5 last:border-b-0">
                  {r.map((cell, c) => (
                    <td key={c} className={cn("px-3 py-2 align-top", alignClass(block.align[c]))}>
                      <InlineNodes nodes={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockNode key={i} block={b} />
      ))}
    </>
  );
}
