import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@useroutr/ui"],
  // Use WASM fallback for SWC to avoid binary issues
  experimental: {
    swcPlugins: [],
  },
};

export default nextConfig;
