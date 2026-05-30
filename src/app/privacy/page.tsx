import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    `How ${SITE_NAME} handles your data. Short version: every tool runs in your browser; nothing leaves your device.`,
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy page. Lives at /privacy so the footer / 404 / sitemap have a real
 * destination to link at. The content is intentionally short — every tool
 * is fully client-side, so the policy is brief and honest.
 */
export default function PrivacyPage() {
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
            Privacy
          </span>
          <h1 className="display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-text">
            How we handle your data.
          </h1>
          <div className="prose prose-sm mt-8 space-y-5 text-[15px] leading-relaxed text-text-muted">
            <p>
              <strong className="text-text">Short version:</strong> every tool
              runs in your browser. Inputs and outputs never reach our servers,
              never appear in logs, never leave your device.
            </p>

            <h2 className="text-text font-semibold text-lg mt-8">
              What we don&apos;t collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text">Tool inputs.</strong> JSON you
                paste into the formatter, regex patterns you test, images you
                compress — none of it transmits anywhere. The tools are pure
                client-side code.
              </li>
              <li>
                <strong className="text-text">Tool outputs.</strong> The same
                applies to converted/transformed data — it stays in your
                browser.
              </li>
              <li>
                <strong className="text-text">Behavioural tracking.</strong>{" "}
                No cookies for analytics, no pixel trackers, no third-party
                tag managers.
              </li>
            </ul>

            <h2 className="text-text font-semibold text-lg mt-8">
              What we do collect
            </h2>
            <p>
              Standard web server access logs (request path, status code,
              user agent, IP address) for normal site operation and abuse
              prevention. These are retained for 30 days and never linked
              to identity.
            </p>

            <h2 className="text-text font-semibold text-lg mt-8">
              Third parties
            </h2>
            <p>
              The site is served from our hosting provider and uses Google
              Fonts for typography. No analytics providers, no ad networks,
              no behavioural profilers.
            </p>

            <h2 className="text-text font-semibold text-lg mt-8">
              Changes
            </h2>
            <p>
              We&apos;ll update this page if any of the above changes. The
              date below tracks the last revision.
            </p>

            <p className="mt-10 text-sm text-text-faint">
              Last updated: 2026-05-29.
            </p>
          </div>
        </article>
      </main>
      <HomeFooter />
    </div>
  );
}
