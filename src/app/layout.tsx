import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jetbrains",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevToolbox — handcrafted developer utilities",
  description:
    "Format JSON, convert cases, encode Base64, test regex, and convert colors — fast, keyboard-first, and beautifully designed.",
  metadataBase: new URL("https://devtoolbox.local"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-bg text-text font-sans">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="light"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-surface !border !border-border !text-text !font-sans !rounded-xl !shadow-[0_8px_24px_-12px_rgba(26,26,24,0.18)]",
                description: "!text-text-muted",
                actionButton: "!bg-brand !text-bg",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
