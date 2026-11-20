import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { FaqBrowser } from "@/components/site/faq/faq-browser";
import { FAQ_GROUPS } from "@/components/site/faq/faq-data";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Answers about privacy, the tools, and how ${SITE_NAME} works. Free, no account, and everything runs in your browser.`,
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    title: `FAQ · ${SITE_NAME}`,
    description: "Questions about privacy, the tools, and how it works — answered.",
    url: "/faq",
  },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: `${SITE_URL}/faq`,
  mainEntity: FAQ_GROUPS.flatMap((g) =>
    g.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  ),
};

export default function FaqPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_JSON_LD) }} />
      <Header variant="landing" />
      <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-10 pb-[72px] sm:px-6 sm:pt-[72px] sm:pb-24">
        <header className="mb-10 flex flex-col items-start gap-3">
          <h1 className="m-0 font-sans text-[36px] leading-[1.06] font-bold tracking-[-0.045em] sm:text-[clamp(40px,5vw,60px)]">
            Questions, answered.
          </h1>
          <p className="m-0 max-w-[620px] text-[17px] text-text-muted">
            Everything people ask about privacy, the tools, and how {SITE_NAME} works.
          </p>
        </header>

        <FaqBrowser groups={FAQ_GROUPS} />

        <div className="surface-panel mt-10 flex flex-wrap items-center gap-3.5 rounded-2xl p-[22px]">
          <div className="flex-[1_1_260px]">
            <div className="text-[17px] font-bold">Still stuck?</div>
            <div className="text-sm text-text-tertiary">Send us a note. A person reads every message.</div>
          </div>
          <Link
            href="/contact"
            className="btn-action inline-flex min-h-11 items-center rounded-[10px] px-[18px] text-sm font-bold"
          >
            Contact us
          </Link>
        </div>
      </main>
      <HomeFooter variant="compact" />
    </div>
  );
}
