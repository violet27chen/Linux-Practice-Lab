import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @vercel/sandbox talks to the Vercel control plane and must stay external
  // to the server bundle so its native/network behaviour is preserved.
  serverExternalPackages: ["@vercel/sandbox"],
  // Lint is run separately; don't fail production builds on lint config.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
