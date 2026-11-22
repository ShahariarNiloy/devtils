/* eslint-disable react/no-array-index-key -- static post content: blocks,
   rows and spans never reorder, so their index is a stable key. */
import Link from "next/link";
import type { Block, Span } from "@/lib/blog/types";
import { cn } from "@/lib/cn";
import { CopyButton } from "./copy-button";

/**
 * Renders a post's structured blocks straight to HTML (no Markdown step).
 * Server component; the code-block Copy button is the only client island.
 */

const LINK = "text-[#e8b48a] underline decoration-clay-light/40 underline-offset-[3px] hover:decoration-clay-light";

function Inline({ spans }: { spans: Span[] }) {
  return spans.map((s, i) => {
    if (typeof s === "string") return s;
    switch (s.t) {
      case "strong":
        return (
          <strong key={i} className="font-bold text-text">
            {s.v}
          </strong>
        );
      case "em":
        return (
          <em key={i} className="italic">
            {s.v}
          </em>
        );
      case "code":
        return (
          <code
            key={i}
            className={cn(
              "rounded-[5px] bg-white/[.07] px-1.5 py-px font-mono [font-variant-ligatures:none] text-[0.86em] text-text",
              s.bold && "font-bold",
            )}
          >
            {s.v}
          </code>
        );
      case "link":
        return (
          <Link key={i} href={s.href} className={LINK}>
            {s.v}
          </Link>
        );
    }
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <figure className="m-0 overflow-hidden rounded-xl border border-white/[.08] bg-[#0d0d0c]">
      <figcaption className="flex items-center border-b border-border-subtle px-3.5 py-2 font-mono text-[11px] text-text-faint">
        <span className="grow">{lang}</span>
        <CopyButton text={code} />
      </figcaption>
      <pre
        tabIndex={0}
        className="m-0 overflow-hidden px-4 py-3.5 font-mono [font-variant-ligatures:none] text-xs leading-[1.65] break-all whitespace-pre-wrap text-text-key sm:overflow-x-auto sm:text-[13px] sm:break-normal sm:whitespace-pre"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function ListBlock({ ordered, items }: { ordered: boolean; items: Span[][] }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    // role="list" keeps list semantics in Safari despite list-style: none.
    <Tag role="list" className="m-0 flex list-none flex-col gap-2 p-0 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="min-w-[18px] shrink-0 font-mono text-[13px] text-clay-light">
            {ordered ? `${i + 1}.` : "—"}
          </span>
          <span>
            <Inline spans={it} />
          </span>
        </li>
      ))}
    </Tag>
  );
}

function TableBlock({ head, rows }: { head: Span[][]; rows: Span[][][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[.08]">
      <table className="w-full table-fixed border-collapse text-[13px] leading-normal sm:text-sm">
        <thead>
          <tr className="bg-toolbar">
            {head.map((c, i) => (
              <th key={i} scope="col" className="px-3 py-[9px] text-left font-bold [overflow-wrap:anywhere] text-text">
                <Inline spans={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-border-subtle">
              {r.map((c, ci) => (
                <td key={ci} className="px-3 py-[9px] align-top [overflow-wrap:anywhere]">
                  <Inline spans={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.k) {
    case "h2":
      return (
        <h2 id={block.id} className="mt-[22px] mb-0 scroll-mt-6 text-[23px] leading-[1.2] text-text sm:text-[27px]">
          {block.v}
        </h2>
      );
    case "h3":
      return <h3 className="mt-2.5 -mb-1.5 text-[19px] leading-[1.3] text-text">{block.v}</h3>;
    case "p":
      return (
        <p className="m-0">
          <Inline spans={block.s} />
        </p>
      );
    case "note":
      return (
        <p className="m-0 text-sm text-text-tertiary italic">
          <Inline spans={block.s} />
        </p>
      );
    case "quote":
      return (
        <aside className="rounded-xl border-l-[3px] border-clay-light bg-clay-light/[.08] px-[18px] py-3.5 text-[#f0e2d0]">
          <Inline spans={block.s} />
        </aside>
      );
    case "ul":
    case "ol":
      return <ListBlock ordered={block.k === "ol"} items={block.items} />;
    case "code":
      return <CodeBlock lang={block.lang} code={block.v} />;
    case "table":
      return <TableBlock head={block.head} rows={block.rows} />;
  }
}

export function PostBody({ blocks }: { blocks: Block[] }) {
  return blocks.map((b, i) => <BlockView key={i} block={b} />);
}
