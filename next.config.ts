import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  }
};

export default nextConfig;
