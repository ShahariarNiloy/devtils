import type { Metadata } from "next";
import { OG_HEIGHT, OG_WIDTH, ogPagePath } from "@/lib/og/url";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import {
  availableTags,
  toReleaseViews,
} from "@/components/site/changelog/changelog-model";
import { ChangelogTimeline } from "@/components/site/changelog/changelog-timeline";
import { CHANGELOG } from "@/lib/changelog";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "What's new",
  description: `What's new in ${SITE_NAME}: every tool we ship and improve, newest first.`,
  alternates: { canonical: "/changelog" },
  twitter: {
    card: "summary_large_image",
    images: [ogPagePath("changelog.png")],
  },
  openGraph: {
    images: [
      { url: ogPagePath("changelog.png"), width: OG_WIDTH, height: OG_HEIGHT },
    ],
    type: "article",
    title: `What's new · ${SITE_NAME}`,
    description: "Every tool we ship and improve, newest first.",
    url: "/changelog",
  },
};

/**
 * /changelog — v2 timeline. The page is RSC; only the filter chips +
 * list are a client island so filtering is instant.
 */
export default function ChangelogPage() {
  const releases = toReleaseViews(CHANGELOG);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header variant="landing" />
      <main
        id="main"
        className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-10 pb-[72px] sm:px-6 sm:pt-[72px] sm:pb-24"
      >
        <header className="mb-10 flex flex-col items-start gap-3">
          <h1 className="m-0 font-sans text-[36px] leading-[1.06] font-bold tracking-[-0.045em] sm:text-[clamp(40px,5vw,60px)]">
            What&apos;s new
          </h1>
          <p className="m-0 max-w-[620px] text-[17px] text-text-muted">
            Every tool we ship, improve or fix. Newest first.
          </p>
        </header>
        <ChangelogTimeline releases={releases} tags={availableTags(releases)} />
      </main>
      <HomeFooter variant="compact" />
    </div>
  );
}
