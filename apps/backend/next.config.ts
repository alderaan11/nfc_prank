import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API-only — no Next.js pages are used
  reactStrictMode: true,

  // Allow larger video uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },

  // Remove X-Powered-By header
  poweredByHeader: false,
};

export default nextConfig;
