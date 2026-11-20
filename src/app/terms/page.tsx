import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/site/legal";
import { SITE_NAME } from "@/lib/site";

const DESCRIPTION = `Terms of service for the ${SITE_NAME} developer utilities.`;

export const metadata: Metadata = {
  title: "Terms",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "article",
    title: `Terms of use · ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

const SECTIONS: readonly LegalSection[] = [
  {
    id: "as-is",
    title: "As-is",
    body: (
      <p>
        {SITE_NAME} is provided as-is. The tools work as documented to the best of our ability,
        but we make no warranty of fitness for any particular purpose.
      </p>
    ),
  },
  {
    id: "use",
    title: "Use",
    body: (
      <p>
        Use the site lawfully. Don&apos;t use the tools to process data you don&apos;t have the
        right to process. Don&apos;t use automated scrapers to exfiltrate the catalogue.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <p>
        To the extent permitted by law, we&apos;re not liable for any damages arising from the use
        or inability to use the site. Every tool runs in your browser, so the data you process
        never leaves your control — but if a tool produces an unexpected result, that result is
        yours to verify.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        We may update these terms; the date below tracks the last revision. Continued use after a
        change constitutes acceptance.
      </p>
    ),
  },
];

/** /terms. Wording is the site owner's — restyle freely, don't rewrite. */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      lede={`The rules for using ${SITE_NAME}, in plain language.`}
      sections={SECTIONS}
      lastUpdated="Last updated: 2026-05-29."
    />
  );
}
