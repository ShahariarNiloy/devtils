import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";

export interface LegalSection {
  /** Anchor id, used by the on-page nav. */
  id: string;
  title: string;
  body: ReactNode;
}

export interface LegalTldr {
  glyph: string;
  /** Tailwind text-colour class for the glyph. */
  glyphClass: string;
  title: string;
  description: string;
}

interface LegalPageProps {
  title: string;
  lede: ReactNode;
  tldr?: readonly LegalTldr[];
  sections: readonly LegalSection[];
  lastUpdated: string;
}

/**
 * Shared v2 layout for /privacy and /terms: page header, optional TL;DR
 * cards, an "On this page" nav, and numbered sections. Pure RSC; the
 * on-page nav is plain anchor links so it needs no client JS.
 */
export function LegalPage({ title, lede, tldr, sections, lastUpdated }: LegalPageProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header variant="landing" />
      <main
        id="main"
        className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-10 pb-[72px] sm:px-6 sm:pt-[72px] sm:pb-24"
      >
        <header className="mb-10 flex flex-col items-start gap-3 text-left">
          <h1 className="m-0 text-[36px] leading-[1.06] font-bold tracking-[-0.045em] text-text sm:text-[clamp(40px,5vw,60px)]">
            {title}
          </h1>
          <p className="m-0 max-w-[620px] text-[17px] leading-[1.6] text-text-muted">{lede}</p>
        </header>

        {tldr && tldr.length > 0 && (
          <ul
            aria-label="Summary"
            className="mb-9 grid list-none gap-2.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]"
          >
            {tldr.map((t) => (
              <li key={t.title} className="surface-panel flex flex-col gap-1.5 rounded-[14px] p-4">
                <span aria-hidden className={`font-mono text-[13px] ${t.glyphClass}`}>
                  {t.glyph}
                </span>
                <span className="text-[15px] font-bold text-text">{t.title}</span>
                <span className="text-[13px] leading-[1.6] text-text-tertiary">{t.description}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-start gap-x-14 gap-y-8">
          <nav
            aria-label="On this page"
            className="flex max-w-full flex-[1_1_200px] flex-col gap-0.5 sm:max-w-[240px]"
          >
            <span className="mb-1.5 text-[12px] font-bold text-text-faint">On this page</span>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex min-h-9 items-center rounded-lg px-2.5 text-[14px] text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text"
              >
                {i + 1}. {s.title}
              </a>
            ))}
          </nav>

          <article className="flex min-w-0 flex-[999_1_520px] flex-col gap-[30px]">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="flex scroll-mt-24 flex-col gap-2.5">
                <h2 className="m-0 text-[20px] font-bold tracking-[-0.02em] text-text">
                  {i + 1}. {s.title}
                </h2>
                <div className="flex flex-col gap-2.5 text-[15px] leading-[1.75] text-[#c9c5b8] [&_p]:m-0 [&_strong]:text-text">
                  {s.body}
                </div>
              </section>
            ))}
            <p className="m-0 text-[13px] text-text-faint">{lastUpdated}</p>
          </article>
        </div>
      </main>
      <HomeFooter variant="compact" />
    </div>
  );
}
