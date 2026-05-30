import { CATEGORIES, CATEGORY_COUNTS } from "@/lib/tools-registry";
import { LIVE_TOOL_COUNT } from "@/lib/implemented-tools";
import { SITE_NAME, SITE_WORDMARK } from "@/lib/site";
import Link from "next/link";

/**
 * Multi-column footer with category links, tier counts, and a small
 * "built quietly" line. Plain warm cream surface — no decorative
 * pattern. Sage olive pip in the wordmark to match the header.
 */
export function HomeFooter() {
  const half = Math.ceil(CATEGORIES.length / 2);
  const colA = CATEGORIES.slice(0, half);
  const colB = CATEGORIES.slice(half);
  return (
    <footer className="relative border-t border-border bg-surface-soft">
      <div className="relative mx-auto grid max-w-8xl grid-cols-2 gap-y-10 gap-x-6 px-6 sm:px-10 py-12 sm:grid-cols-4">
        {/* Brand block */}
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-sage-olive)" }}
              aria-hidden
            />
            <span
              className="display text-base font-bold text-text"
              style={{ letterSpacing: "-0.025em" }}
            >
              {SITE_WORDMARK}
            </span>
          </div>
          <p
            className="mt-3 text-sm text-text-muted leading-desc"
            style={{ maxWidth: 240 }}
          >
            {LIVE_TOOL_COUNT} handcrafted developer utilities live today —
            free, fast, keyboard-first, and built quietly.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-faint">
            <Stat label="tools live" value={LIVE_TOOL_COUNT} />
            <Stat label="categories" value={CATEGORIES.length} />
          </div>
        </div>

        {/* Categories — column A */}
        <div>
          <FooterHeading>Categories</FooterHeading>
          <ul className="space-y-2">
            {colA.map((c) => (
              <FooterLink key={c} href={`/tools?cat=${encodeURIComponent(c)}`}>
                {c}
                <span className="text-text-faint">
                  {CATEGORY_COUNTS[c] === 0
                    ? " · soon"
                    : ` · ${CATEGORY_COUNTS[c]}`}
                </span>
              </FooterLink>
            ))}
          </ul>
        </div>

        {/* Categories — column B */}
        <div>
          <FooterHeading>&nbsp;</FooterHeading>
          <ul className="space-y-2">
            {colB.map((c) => (
              <FooterLink key={c} href={`/tools?cat=${encodeURIComponent(c)}`}>
                {c}
                <span className="text-text-faint">
                  {CATEGORY_COUNTS[c] === 0
                    ? " · soon"
                    : ` · ${CATEGORY_COUNTS[c]}`}
                </span>
              </FooterLink>
            ))}
          </ul>
        </div>

        {/* Resources */}
        <div>
          <FooterHeading>Resources</FooterHeading>
          <ul className="space-y-2">
            <FooterLink href="/tools">All tools</FooterLink>
            <FooterLink href="/changelog">Changelog</FooterLink>
            <FooterLink href="/#faq">FAQ</FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </ul>
        </div>
      </div>

      {/* Bottom rule */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-8xl px-6 sm:px-10 py-5 flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-text-faint">
            © {new Date().getFullYear()} {SITE_NAME} · made with care
          </p>
          <div className="flex items-center gap-4 text-sm text-text-faint">
            <Link href="/privacy" className="hover:text-text transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-text transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-text transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-bold uppercase tracking-ultra mb-3 text-text-faint">
      {children}
    </p>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-text-muted transition-colors hover:text-text"
      >
        {children}
      </Link>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <strong className="text-sm font-semibold tabular-nums text-text">
        {value}
      </strong>
      <span>{label}</span>
    </span>
  );
}
