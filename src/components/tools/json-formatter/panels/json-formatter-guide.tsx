"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="w-32 shrink-0 text-base font-medium text-text">{label}</span>
      <span className="text-base text-text-muted leading-relaxed">{children}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-soft px-4 py-3 flex flex-col gap-1.5">
      <span className="text-base font-semibold text-text">{title}</span>
      <span className="text-base text-text-muted leading-relaxed">{children}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-bg text-sm font-semibold flex items-center justify-center leading-none">
        {n}
      </span>
      <span className="text-base text-text-muted leading-relaxed pt-0.5">{children}</span>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-sm rounded bg-surface-soft px-1.5 py-0.5 border border-border-subtle">
      {children}
    </code>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-text">{children}</strong>;
}

function GuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 -translate-y-1/2 w-[min(820px,calc(100vw-32px))] flex flex-col max-h-[min(820px,calc(100vh-48px))]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">
            How to use: JSON Formatter
          </DialogTitle>
          <DialogDescription>
            A walkthrough of the interface and what each part does.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 flex flex-col gap-7 overflow-y-auto min-h-0">

          {/* The two panes */}
          <Section title="The two panes">
            <div className="grid grid-cols-2 gap-3">
              <Card title="Left: Input">
                Paste, type, drop a file, or fetch from a URL. Validation runs
                live — a green dot means valid JSON, red means there&apos;s a
                syntax error with the line/col highlighted.
              </Card>
              <Card title="Right: Output">
                The formatted result, in five interchangeable views. Switch
                tabs to look at the same data as code, a collapsible tree, a
                table, a grid, or a flat path list.
              </Card>
            </div>
          </Section>

          <div className="h-px bg-border-subtle" />

          {/* Top toolbar */}
          <Section title="Top toolbar">
            <div className="flex flex-col gap-2.5">
              <Row label="Format">
                Pretty-prints valid JSON using your chosen indent. Shortcut:{" "}
                <Code>⌘ ↵</Code>. Also runs automatically when you paste valid
                JSON into an empty input.
              </Row>
              <Row label="Minify">
                Strips every byte of whitespace. Shows you a savings badge
                (before → after, % saved) and a one-click Restore.{" "}
                <Code>⌘ ⇧ M</Code>.
              </Row>
              <Row label="Sort">
                Reorders keys alphabetically (A→Z or Z→A) at every level, or
                clears the order. <Code>⌘ ⇧ S</Code> for A→Z.
              </Row>
              <Row label="Repair">
                Fixes common mistakes — trailing commas, single quotes,
                unquoted keys, missing brackets — and lists what changed.
                Useful when copying JS object literals or sloppy logs.{" "}
                <Code>⌘ ⇧ R</Code>.
              </Row>
              <Row label="Convert">
                One-way translations: JSON → CSV, YAML, TypeScript types, XML,
                or Zod schema; and back from CSV / YAML to JSON.
              </Row>
              <Row label="Indent">
                <Strong>2 spaces</Strong>, <Strong>4 spaces</Strong>, or{" "}
                <Strong>Tab</Strong>. Applied on Format and on paste-format.
              </Row>
            </div>
          </Section>

          <div className="h-px bg-border-subtle" />

          {/* Output views */}
          <Section title="Output views">
            <div className="grid grid-cols-2 gap-3 auto-rows-fr">
              <Card title="Code">
                Syntax-highlighted JSON. The default. Use the search icon to
                filter the visible matches.
              </Card>
              <Card title="Tree">
                Collapsible nodes with type badges and counts. Click an arrow
                to fold a branch; use the expand/collapse-all buttons in the
                tab bar to do the whole tree at once.
              </Card>
              <Card title="Table">
                Renders an array of objects as rows × columns. Only enabled
                when the data is shaped that way.
              </Card>
              <Card title="Grid">
                A denser tabular view of the same array-of-objects, optimised
                for scanning many rows.
              </Card>
              <Card title="Path">
                Flattens the whole document into <Code>$.foo.bar = value</Code>{" "}
                lines — the quickest way to copy a JSONPath to a specific
                leaf.
              </Card>
            </div>
          </Section>

          <div className="h-px bg-border-subtle" />

          {/* Power features */}
          <Section title="Power features">
            <div className="flex flex-col gap-2.5">
              <Row label="Search">
                Magnifier icon on the output bar — highlights matches inline
                and counts them. Case-insensitive substring match.
              </Row>
              <Row label="JSONPath">
                Magnifier icon on the top bar opens the query panel. JSONPath
                is like XPath for JSON. Examples:{" "}
                <Code>$.users[*].email</Code> (every user&apos;s email),{" "}
                <Code>$..price</Code> (every <em>price</em> anywhere),{" "}
                <Code>$.users[?(@.age{">"}30)]</Code> (filter). The panel
                auto-runs 200&nbsp;ms after you stop typing; the Run button
                (<Code>⌘ ⇧ Q</Code>) re-runs on demand.
              </Row>
              <Row label="Stats">
                Bar-chart icon — shows depth, key count, type histogram, line
                count and byte size for the current document.
              </Row>
              <Row label="Recent">
                Anything you load (sample, file, URL) is remembered in your
                browser. Restore from the empty state&apos;s <Strong>Recent</Strong>{" "}
                card. Nothing leaves the device.
              </Row>
            </div>
          </Section>

          <div className="h-px bg-border-subtle" />

          {/* Workflows */}
          <Section title="Common workflows">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Beautify a one-line response</p>
                <Step n={1}>Paste the JSON into the left pane.</Step>
                <Step n={2}>It auto-formats. If not, hit <Strong>Format</Strong> (<Code>⌘ ↵</Code>).</Step>
                <Step n={3}>Switch to <Strong>Tree</Strong> to explore, or copy from the output bar.</Step>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Fix broken JSON</p>
                <Step n={1}>Paste — the red banner names the line/col of the error.</Step>
                <Step n={2}>Click <Strong>Repair</Strong>. The fixed JSON replaces the input.</Step>
                <Step n={3}>Read the change log under the input to see what was patched.</Step>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Pull a value with JSONPath</p>
                <Step n={1}>Format the JSON first so the query has parsed output to run on.</Step>
                <Step n={2}>Click the magnifier on the top bar, type your path.</Step>
                <Step n={3}>Read the numbered results below; copy with Cmd-click.</Step>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Convert to TypeScript types</p>
                <Step n={1}>Format your sample response.</Step>
                <Step n={2}>Open <Strong>Convert</Strong> → <Strong>JSON → TypeScript</Strong>.</Step>
                <Step n={3}>Copy the inferred interfaces from the output pane.</Step>
              </div>
            </div>
          </Section>

        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JsonFormatterGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-text underline underline-offset-2 hover:text-text-muted transition-colors cursor-pointer shrink-0"
      >
        <BookOpen size={14} aria-hidden />
        How to use
      </button>
      <GuideDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
