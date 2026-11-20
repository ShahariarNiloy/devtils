import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { KeyboardBento } from "@/components/home/keyboard-bento";
import { LandingHero } from "@/components/home/landing-hero";
import { LauncherDemo } from "@/components/home/launcher-demo";
import {
  CATALOGUE_COUNT,
  CATEGORY_COUNT,
  LANDING_FAQ,
  SHOWCASE_TOOLS_V2,
} from "@/components/home/landing-data";
import {
  ClosingSection,
  InstallSection,
  LandingFaq,
  ShippingSection,
  VerifySection,
} from "@/components/home/landing-sections";
import { ToolCards } from "@/components/home/tool-cards";
import { HomepageJsonLd } from "@/components/shared/tool-jsonld";

export default function Home() {
  return (
    // overflow-x-clip: the hero glyph field is 1400px wide by design.
    <div className="flex min-h-dvh flex-col overflow-x-clip text-base leading-[1.55]">
      <HomepageJsonLd faqs={LANDING_FAQ} />
      <Header variant="landing" />

      <main id="main" className="flex-1">
        <LandingHero />

        <section id="tools" className="flex flex-col items-center gap-10 px-6 pt-10">
          <div className="flex flex-col gap-0.5 text-center">
            <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em]">Take shortcuts, not tabs.</h2>
            <p className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-text-faint">One search box, every tool.</p>
          </div>
          <LauncherDemo tools={SHOWCASE_TOOLS_V2} catalogueCount={CATALOGUE_COUNT} />
          <p className="m-0 max-w-[520px] text-center text-[17px] text-text-faint">
            <strong className="font-bold text-text">Private by default.</strong> Paste production tokens and customer
            payloads — nothing you type ever leaves the tab.
          </p>
        </section>

        <KeyboardBento />
        <ToolCards tools={SHOWCASE_TOOLS_V2} categoryCount={CATEGORY_COUNT} catalogueCount={CATALOGUE_COUNT} />
        <VerifySection />
        <ShippingSection />
        <InstallSection />
        <LandingFaq />
        <ClosingSection />
      </main>
      <HomeFooter />
    </div>
  );
}
