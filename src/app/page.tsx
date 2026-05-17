import { Header } from "@/components/layout/header";
import { Hero } from "@/components/layout/hero";
import { HomeFooter } from "@/components/layout/home-footer";
import { WhySection } from "@/components/home/why-section";
import { CategoriesSection } from "@/components/home/categories-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { RecentlyAddedSection } from "@/components/home/recently-added-section";
import { PricingSection } from "@/components/home/pricing-section";
import { FaqSection } from "@/components/home/faq-section";
import { ClosingCta } from "@/components/home/closing-cta";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main id="main" className="flex-1">
        <Hero />
        <WhySection />
        <CategoriesSection />
        <FeaturedSection />
        <RecentlyAddedSection />
        <PricingSection />
        <FaqSection />
        <ClosingCta />
        <HomeFooter />
      </main>
    </div>
  );
}
