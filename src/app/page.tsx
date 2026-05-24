import { Header } from "@/components/layout/header";
import { Hero } from "@/components/layout/hero";
import { HomeFooter } from "@/components/layout/home-footer";
import { WhySection } from "@/components/home/why-section";
import { CategoriesSection } from "@/components/home/categories-section";
import { ManifestoSection } from "@/components/home/manifesto-section";
import { DifferenceSection } from "@/components/home/difference-section";
import { FaqSection } from "@/components/home/faq-section";
import { ClosingCta } from "@/components/home/closing-cta";
import { Reveal } from "@/components/home/reveal";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main id="main" className="flex-1">
        <Hero />
        <Reveal>
          <WhySection />
        </Reveal>
        <Reveal>
          <CategoriesSection />
        </Reveal>
        <Reveal>
          <ManifestoSection />
        </Reveal>
        <Reveal>
          <DifferenceSection />
        </Reveal>
        <Reveal>
          <FaqSection />
        </Reveal>
        <Reveal>
          <ClosingCta />
        </Reveal>
        <HomeFooter />
      </main>
    </div>
  );
}
