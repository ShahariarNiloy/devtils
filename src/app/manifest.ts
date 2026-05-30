import type { MetadataRoute } from "next";
import {
  SITE_DESCRIPTION,
  SITE_TITLE_DEFAULT,
  SITE_WORDMARK,
} from "@/lib/site";

/**
 * Web App Manifest. Lets the browser treat the site like an installable
 * web app on Chrome / Safari / Edge with the right name + icons + theme
 * colours. README promises "add to home screen" works; this is what makes
 * the promise true.
 *
 * Icon files need to live in `public/icons/` — leaving the references in
 * here ahead of the assets so the manifest is ready to validate the
 * moment the icons drop. Until then, a single favicon entry keeps the
 * manifest valid.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE_DEFAULT,
    short_name: SITE_WORDMARK,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2ea",
    theme_color: "#f6f2ea",
    orientation: "portrait-primary",
    categories: ["developer", "utilities", "productivity"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
