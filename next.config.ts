import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com'],
  },
};

export default nextConfig;
