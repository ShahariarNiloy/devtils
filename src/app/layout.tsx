import { ShortcutsOverlay } from "@/components/shared/shortcuts-overlay";
import { ThemeProvider } from "@/components/theme-provider";
import { WebMcpProvider } from "@/components/webmcp-provider";
import { OG_DEFAULT_PATH, OG_HEIGHT, OG_WIDTH } from "@/lib/og/url";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_SHORT,
  SITE_NAME,
  SITE_TITLE_DEFAULT,
  SITE_URL,
} from "@/lib/site";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

import { Fredoka, JetBrains_Mono, Noto_Sans } from "next/font/google";

// v2 type: Fredoka for headings and the wordmark, Noto Sans for everything
// else, JetBrains Mono for code and keycaps. Exposed as variables that
// --font-display / --font-sans / --font-mono in globals.css read.
// Fredoka is a variable font: load the axis (covers 500/600) rather than
// fixed weights — fixed weights produced mismatched class hashes between
// the server and client builds, so headings silently fell back.
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-display-fredoka",
  display: "swap",
});
const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans-noto",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jetbrains",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION_SHORT,
    images: [
      {
        url: OG_DEFAULT_PATH,
        width: OG_WIDTH,
        height: OG_HEIGHT,
        alt: SITE_TITLE_DEFAULT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION_SHORT,
    images: [OG_DEFAULT_PATH],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${fredoka.variable} ${notoSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-bg text-text font-sans">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          {children}
          <WebMcpProvider />
          <ShortcutsOverlay />
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-surface !border !border-border !text-text !font-sans !rounded-xl !shadow-float",
                description: "!text-text-muted",
                actionButton: "!bg-brand !text-on-brand",
              },
            }}
          />
        </ThemeProvider>

        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
            strategy="afterInteractive"
            id="cloudflare-analytics"
          />
        )}
      </body>
    </html>
  );
}
