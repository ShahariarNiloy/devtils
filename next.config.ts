import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this app — otherwise it walks up to a
  // parent monorepo's lockfile.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The icon resolver imports `* as LucideIcons` so any registry entry can
  // resolve dynamically. This flag rewrites that into per-icon imports
  // during build so we don't ship the entire library.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
