import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { ComingNext } from "@/components/site/request/coming-next";
import { RequestForm } from "@/components/site/request/request-form";
import { CATEGORIES } from "@/lib/tools-registry";
import { SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Missing a developer tool you reach for every day? Tell us what it should do and we'll consider it for the next batch.";

export const metadata: Metadata = {
  title: "Request a tool",
  description: DESCRIPTION,
  alternates: { canonical: "/request" },
  openGraph: {
    type: "website",
    title: `Request a tool · ${SITE_NAME}`,
    description: DESCRIPTION,
    url: "/request",
  },
};

const CATEGORY_OPTIONS = [...CATEGORIES, "Other"] as const;

export default function RequestPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header variant="landing" />
      <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-10 pb-[72px] sm:px-6 sm:pt-[72px] sm:pb-24">
        <header className="mb-10 flex flex-col items-start gap-3 text-left">
          <h1 className="m-0 text-[36px] leading-[1.06] font-bold tracking-[-0.045em] sm:text-[clamp(40px,5vw,60px)]">
            Request a tool
          </h1>
          <p className="m-0 max-w-[620px] text-[17px] text-text-muted">
            Missing something you reach for every day? Tell us. Requests decide what we build next.
          </p>
        </header>

        <div className="flex flex-wrap items-start gap-7">
          <div className="surface-panel min-w-0 flex-[1.2_1_380px] rounded-[18px] p-[22px]">
            <RequestForm categories={CATEGORY_OPTIONS} to={SITE_EMAIL} pageUrl={`${SITE_URL}/request`} />
          </div>
          <ComingNext />
        </div>
      </main>
      <HomeFooter variant="compact" />
    </div>
  );
}
