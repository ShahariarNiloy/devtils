import type { Metadata } from "next";
import { OG_HEIGHT, OG_WIDTH, ogPagePath } from "@/lib/og/url";
import {
  LegalPage,
  type LegalSection,
  type LegalTldr,
} from "@/components/site/legal";
import { SITE_NAME } from "@/lib/site";

const DESCRIPTION = `How ${SITE_NAME} handles your data. Short version: every tool runs in your browser; nothing leaves your device.`;

export const metadata: Metadata = {
  title: "Privacy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  twitter: { card: "summary_large_image", images: [ogPagePath("default.png")] },
  openGraph: {
    images: [
      { url: ogPagePath("default.png"), width: OG_WIDTH, height: OG_HEIGHT },
    ],
    type: "article",
    title: `Privacy policy · ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

/** TL;DR cards — each one restates only what the sections below say. */
const TLDR: readonly LegalTldr[] = [
  {
    glyph: "{ }",
    glyphClass: "text-clay-light",
    title: "Tools run locally",
    description:
      "Inputs and outputs never reach our servers or leave your device.",
  },
  {
    glyph: "0",
    glyphClass: "text-success",
    title: "No tracking",
    description:
      "No analytics cookies, pixel trackers or third-party tag managers.",
  },
  {
    glyph: "~",
    glyphClass: "text-cat-teal",
    title: "Access logs only",
    description:
      "Standard server logs, kept for 30 days and never linked to identity.",
  },
];

const SECTIONS: readonly LegalSection[] = [
  {
    id: "what-we-dont-collect",
    title: "What we don’t collect",
    body: (
      <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong>Tool inputs.</strong> JSON you paste into the formatter, regex
          patterns you test, images you compress — none of it transmits
          anywhere. The tools are pure client-side code.
        </li>
        <li>
          <strong>Tool outputs.</strong> The same applies to
          converted/transformed data — it stays in your browser.
        </li>
        <li>
          <strong>Behavioural tracking.</strong> No cookies for analytics, no
          pixel trackers, no third-party tag managers.
        </li>
      </ul>
    ),
  },
  {
    id: "what-we-do-collect",
    title: "What we do collect",
    body: (
      <p>
        Standard web server access logs (request path, status code, user agent,
        IP address) for normal site operation and abuse prevention. These are
        retained for 30 days and never linked to identity.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third parties",
    body: (
      <p>
        The site is served from our hosting provider and uses Google Fonts for
        typography. No analytics providers, no ad networks, no behavioural
        profilers.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        We&apos;ll update this page if any of the above changes. The date below
        tracks the last revision.
      </p>
    ),
  },
];

/**
 * /privacy. Every tool is fully client-side, so the policy is brief and
 * honest. Wording is the site owner's policy — restyle freely, but don't
 * rewrite it.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lede={
        <>
          <strong className="font-semibold text-text">Short version:</strong>{" "}
          every tool runs in your browser. Inputs and outputs never reach our
          servers, never appear in logs, never leave your device.
        </>
      }
      tldr={TLDR}
      sections={SECTIONS}
      lastUpdated="Last updated: 2026-05-29."
    />
  );
}
