import Link from "next/link";
import type { Metadata } from "next";
import { Mail, MessageSquare } from "lucide-react";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch about devtils — report bugs, request a new tool, or say hello.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1 bg-bg">
        <article className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-text-faint">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-sage-olive)]"
            />
            Contact
          </span>
          <h1 className="display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-text">
            Drop us a line.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
            Bug reports, feature requests, and ideas for the catalogue are
            all welcome. The faster path is usually the issue tracker.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Link
              href="mailto:hello@devtils.com"
              className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-border-strong transition-colors"
            >
              <Mail
                size={18}
                className="mt-0.5 text-[color:var(--color-brand)]"
                aria-hidden
              />
              <div>
                <div className="text-[14px] font-semibold text-text">Email</div>
                <div className="mt-0.5 text-[12.5px] text-text-faint">
                  hello@devtils.com
                </div>
              </div>
            </Link>
            <Link
              href="https://github.com/devtils/devtils/issues"
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-border-strong transition-colors"
            >
              <MessageSquare
                size={18}
                className="mt-0.5 text-[color:var(--color-brand)]"
                aria-hidden
              />
              <div>
                <div className="text-[14px] font-semibold text-text">
                  Issue tracker
                </div>
                <div className="mt-0.5 text-[12.5px] text-text-faint">
                  github.com/devtils/devtils
                </div>
              </div>
            </Link>
          </div>
        </article>
      </main>
      <HomeFooter />
    </div>
  );
}
