"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { buildRequestMail, validateRequest, type RequestDraft, type RequestMail } from "./request-mail";
import { Dropdown } from "@/components/primitives/select";

const EMPTY = (category: string): RequestDraft => ({ name: "", what: "", category, email: "" });

const FIELD =
  "w-full rounded-[10px] border bg-bg text-[15px] text-text font-[inherit] placeholder:text-placeholder outline-none transition-[border-color,box-shadow] duration-150 focus:border-[rgba(224,160,114,0.6)] focus:shadow-[0_0_0_3px_rgba(224,160,114,0.15)]";

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-text-strong">
        {label} {optional && <span className="font-medium text-text-faint">(optional)</span>}
      </label>
      {children}
      <span id={`${id}-err`} className={cn("text-[13px] text-error-text", error ? "min-h-[18px]" : "min-h-0")}>
        {error}
      </span>
    </div>
  );
}

/**
 * Request form. There is no backend: "Send request" validates, then opens
 * the visitor's email app with a prefilled message to the site address.
 * The success state says exactly that — nothing is "received" until they
 * press send in their own mail client.
 */
export function RequestForm({ categories, to, pageUrl }: { categories: readonly string[]; to: string; pageUrl: string }) {
  const uid = useId();
  const ids = { name: `${uid}-name`, what: `${uid}-what`, cat: `${uid}-cat`, email: `${uid}-email` };
  const [draft, setDraft] = useState<RequestDraft>(() => EMPTY(categories[0] ?? "Other"));
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<RequestMail | null>(null);
  const [sentName, setSentName] = useState("");
  const doneRef = useRef<HTMLHeadingElement>(null);

  const errors = tried ? validateRequest(draft) : {};
  const set = (k: keyof RequestDraft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validateRequest(draft);
    const firstBad = (["name", "what", "email"] as const).find((k) => errs[k]);
    if (firstBad) {
      setTried(true);
      document.getElementById(ids[firstBad])?.focus();
      return;
    }
    const mail = buildRequestMail(draft, to, pageUrl);
    setSent(mail);
    setSentName(draft.name.trim());
    setTried(false);
    window.location.href = mail.href;
    requestAnimationFrame(() => doneRef.current?.focus());
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Request copied");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  }

  function again() {
    setSent(null);
    setDraft(EMPTY(categories[0] ?? "Other"));
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center gap-2.5 px-2.5 py-10 text-center">
        <span aria-hidden="true" className="surface-key flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-success">
          ✓
        </span>
        <h2 ref={doneRef} tabIndex={-1} className="m-0 text-[22px] font-bold outline-none">
          Your email app should be open
        </h2>
        <p className="m-0 max-w-[380px] text-[15px] text-text-tertiary">
          We filled in a message to <span className="text-text">{to}</span> about “{sentName}”. Nothing is sent until you
          press send there.
        </p>
        {sent.trimmed && (
          <p className="m-0 max-w-[380px] text-[13px] text-warning-text">
            Your description was long, so the email has a shortened copy. Use “Copy request” to paste the full text in.
          </p>
        )}
        <p className="m-0 max-w-[380px] text-[13px] text-text-faint">
          Nothing opened? Copy the request and email it to {to} yourself.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <a
            href={sent.href}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-border-strong px-4 text-sm font-semibold text-text hover:text-text"
          >
            Open email again
          </a>
          <button
            type="button"
            onClick={() => copy(sent.text)}
            className="min-h-11 cursor-pointer rounded-[10px] border border-border-strong bg-transparent px-4 text-sm font-semibold text-text"
          >
            Copy request
          </button>
          <button
            type="button"
            onClick={again}
            className="min-h-11 cursor-pointer rounded-[10px] border border-border-strong bg-transparent px-4 text-sm font-semibold text-text"
          >
            Request another
          </button>
        </div>
      </div>
    );
  }

  const border = (err?: string) => (err ? "border-error" : "border-border");

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <h2 className="m-0 text-lg font-bold">Tell us what to build</h2>

      <Field id={ids.name} label="Tool name" error={errors.name}>
        <input
          id={ids.name}
          type="text"
          value={draft.name}
          onChange={set("name")}
          placeholder="e.g. JSON → Kotlin"
          maxLength={120}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={`${ids.name}-err`}
          className={cn(FIELD, "min-h-[46px] px-3.5", border(errors.name))}
        />
      </Field>

      <Field id={ids.what} label="What should it do?" error={errors.what}>
        <textarea
          id={ids.what}
          value={draft.what}
          onChange={set("what")}
          placeholder="Paste an example input and the output you'd expect…"
          aria-invalid={errors.what ? true : undefined}
          aria-describedby={`${ids.what}-err`}
          className={cn(FIELD, "min-h-[110px] resize-y px-3.5 py-3 leading-[1.6]", border(errors.what))}
        />
      </Field>

      <Field id={ids.cat} label="Category">
        <Dropdown
          id={ids.cat}
          value={draft.category}
          onChange={(category) => setDraft((d) => ({ ...d, category }))}
          options={categories.map((c) => ({ value: c, label: c }))}
          className={cn(FIELD, "h-auto min-h-[46px] px-3", border())}
        />
      </Field>

      <Field id={ids.email} label="Email" optional error={errors.email}>
        <input
          id={ids.email}
          type="email"
          autoComplete="email"
          value={draft.email}
          onChange={set("email")}
          placeholder="Only to tell you when it ships"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={`${ids.email}-err`}
          className={cn(FIELD, "min-h-[46px] px-3.5", border(errors.email))}
        />
      </Field>

      <button type="submit" className="btn-action min-h-[50px] cursor-pointer rounded-xl border-0 text-base font-bold">
        Send request
      </button>
      <p className="m-0 text-xs text-text-faint">
        Opens your email app with the request filled in. We only use your email to tell you when the tool ships.
      </p>
    </form>
  );
}
