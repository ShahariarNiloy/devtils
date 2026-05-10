import { Header } from "@/components/layout/header";
import { Hero } from "@/components/layout/hero";
import { HomeFooter } from "@/components/layout/home-footer";
import { FeaturedSection } from "@/components/home/featured-section";
import { RecentlyAddedSection } from "@/components/home/recently-added-section";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main id="main" className="flex-1">
        <Hero />
        <FeaturedSection />
        <RecentlyAddedSection />
        <HomeFooter />
      </main>
    </div>
  );
}
