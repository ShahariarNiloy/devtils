"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/**
 * App-wide theme provider. We bind to the `data-theme` attribute on `<html>`
 * so our Tailwind v4 `[data-theme="..."]` selectors and CSS custom properties
 * activate without an extra `class`.
 */
export function ThemeProvider({ children }: Props) {
  return (
    <NextThemes
      attribute="data-theme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
