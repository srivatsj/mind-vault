import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com', 'gurdtk4gvn8sxhrj.public.blob.vercel-storage.com',],
  },
};

export default nextConfig;
