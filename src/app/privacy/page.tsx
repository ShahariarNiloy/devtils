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
      "Cookieless page-view counts only. No cookies, pixels or ad tags.",
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
          anywhere. Nothing leaves your browser.
        </li>
        <li>
          <strong>Tool outputs.</strong> The same applies to
          converted/transformed data — it stays in your browser.
        </li>
        <li>
          <strong>Behavioural tracking.</strong> No cookies, no pixel trackers,
          no third-party tag managers, no cross-site profiles.
        </li>
      </ul>
    ),
  },
  {
    id: "requests-you-ask-for",
    title: "Requests you ask for",
    body: (
      <p>
        A few tools can fetch something on your behalf — loading JSON from a
        URL in the JSON formatter, or a token issuer&apos;s public keys in the
        JWT decoder. Your browser fetches it directly from that site; it never
        passes through our servers, and the tool only does it when you ask.
      </p>
    ),
  },
  {
    id: "what-we-do-collect",
    title: "What we do collect",
    body: (
      <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong>Page-view counts.</strong> Cloudflare Web Analytics counts
          visits in aggregate: the page address, referrer, browser type,
          country and page-load timings. It sets no cookies and stores nothing
          on your device, and nothing you type or paste into a tool is part
          of it.
        </li>
        <li>
          <strong>Access logs.</strong> Standard web server access logs
          (request path, status code, user agent, IP address) for normal site
          operation and abuse prevention. These are retained for 30 days and
          never linked to identity.
        </li>
      </ul>
    ),
  },
  {
    id: "third-parties",
    title: "Third parties",
    body: (
      <p>
        The site is hosted on Vercel, and page views are counted by Cloudflare
        Web Analytics as described above. Fonts are served from our own
        domain, so your browser never contacts Google or any other font
        service. No ad networks, no behavioural profilers.
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
 * /privacy. Nothing a tool handles leaves the browser, so the policy is brief and
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
      lastUpdated="Last updated: 2026-11-22."
    />
  );
}
