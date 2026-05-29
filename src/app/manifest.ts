import type { MetadataRoute } from "next";

/**
 * Web App Manifest. Lets the browser treat devtils like an installable
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
    name: "devtils — handcrafted developer utilities",
    short_name: "devtils",
    description:
      "Format JSON, convert cases, encode Base64, test regex, and convert colors. Every tool runs in your browser.",
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
