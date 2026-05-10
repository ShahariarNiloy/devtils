"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/primitives/dialog';

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
      <span className="w-36 shrink-0 text-base font-medium text-text">{label}</span>
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

function GuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 -translate-y-1/2 w-[min(800px,calc(100vw-32px))] flex flex-col max-h-[min(800px,calc(100vh-48px))]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">
            How to use: Base64 Encoder &amp; Decoder
          </DialogTitle>
          <DialogDescription>
            A walkthrough of the interface and what each part does.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 flex flex-col gap-7 overflow-y-auto min-h-0">

          {/* The three panes */}
          <Section title="The three panes">
            <div className="grid grid-cols-3 gap-3">
              <Card title="Left: Input">
                Type or paste whatever you want to convert here. The tool reads it live, no submit button.
              </Card>
              <Card title="Middle: Actions">
                Buttons for uploading a file, copying the result, validating the
                input, downloading, and loading examples.
              </Card>
              <Card title="Right: Output">
                The converted result, updating in real time. Switch tabs to see
                different views of the same output.
              </Card>
            </div>
          </Section>

          <div className="h-px bg-border-subtle" />

          {/* Topbar controls */}
          <Section title="Topbar controls">
            <div className="flex flex-col gap-2.5">
              <Row label="Direction toggle">
                Switches between <strong className="font-medium text-text">Encode</strong> (anything → Base64) and{" "}
                <strong className="font-medium text-text">Decode</strong> (Base64 → original).
                Everything adjusts the moment you flip it.
              </Row>
              <Row label="Variant">
                All four variants produce valid Base64. They differ in which special
                characters they use.{" "}
                <strong className="font-medium text-text">Standard</strong> is the safe default.{" "}
                <strong className="font-medium text-text">URL-safe</strong> is required for JWTs
                and query strings.{" "}
                <strong className="font-medium text-text">MIME</strong> and{" "}
                <strong className="font-medium text-text">PEM</strong> add line breaks for
                email bodies and certificates.
              </Row>
              <Row label="Charset">
                Controls how your text is turned into bytes before encoding.{" "}
                <strong className="font-medium text-text">UTF-8</strong> handles everything.
                Leave it here unless a system explicitly asks for Latin-1 or ASCII.
              </Row>
            </div>
          </Section>

          <div className="h-px bg-border-subtle" />

          {/* Output tabs */}
          <Section title="Output formats">
            <div className="grid grid-cols-2 gap-3 auto-rows-fr">
              <Card title="Text">
                The plain result: the Base64 string when encoding, or the decoded
                text when decoding. This is what you copy most of the time.
              </Card>
              <Card title="Hex dump">
                The raw bytes of the result shown as offset · hex pairs · ASCII
                characters. Useful when you need to inspect binary content.
              </Card>
              <Card title="Data URI">
                Wraps the encoded output into a <code className="font-mono text-sm">data:mime;base64,…</code> string
                you can paste directly into an HTML <code className="font-mono text-sm">src</code> or CSS{" "}
                <code className="font-mono text-sm">url()</code>.
              </Card>
              <Card title="Diff">
                Puts your original input next to the round-tripped version
                (encode → decode) so you can confirm nothing was lost or changed.
              </Card>
              <Card title="Image">
                Only enabled when the decoded output is a recognised image (PNG, JPEG, GIF, WebP).
                Shows a live preview with dimensions and file size. Automatically selected when
                you upload an image file.
              </Card>
            </div>
          </Section>

          <div className="h-px bg-border-subtle" />

          {/* Workflows */}
          <Section title="Common workflows">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Encode text</p>
                <Step n={1}>Set direction to <strong className="font-medium text-text">Encode</strong>.</Step>
                <Step n={2}>Paste or type your text in the left pane.</Step>
                <Step n={3}>Copy the result from the right pane or hit <strong className="font-medium text-text">Copy result</strong>.</Step>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Decode a Base64 string</p>
                <Step n={1}>Set direction to <strong className="font-medium text-text">Decode</strong>.</Step>
                <Step n={2}>Paste the Base64 string in the left pane.</Step>
                <Step n={3}>Read the decoded output on the right. If it&apos;s an image, switch to the <strong className="font-medium text-text">Image</strong> tab.</Step>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Encode a file</p>
                <Step n={1}>Click <strong className="font-medium text-text">Upload file</strong> in the middle panel.</Step>
                <Step n={2}>The file bytes are encoded and the Base64 appears on the right.</Step>
                <Step n={3}>Switch to <strong className="font-medium text-text">Data URI</strong> tab to get an embeddable string.</Step>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-base font-medium text-text">Decode a JWT payload</p>
                <Step n={1}>Open <strong className="font-medium text-text">Try an example</strong> and pick <em>JWT payload</em>.</Step>
                <Step n={2}>The middle segment of the token is decoded automatically.</Step>
                <Step n={3}>Read the JSON claims in the output pane.</Step>
              </div>
            </div>
          </Section>

        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Base64Guide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto inline-flex items-center gap-1.5 text-sm text-text underline underline-offset-2 hover:text-text-muted transition-colors cursor-pointer shrink-0"
      >
        <BookOpen size={14} aria-hidden />
        How to use
      </button>
      <GuideDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
