import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Limit memory footprint in development by aggressively disposing inactive compiled routes
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Bound in-memory cache to 50MB to avoid paging thrash in RAM
  cacheMaxMemorySize: 50 * 1024 * 1024,
  experimental: {
    // Restrict compilation workers to 4 threads to prevent 100% CPU lockups on 12-thread systems
    cpus: 4,
    // Enable Turbopack filesystem cache for dev to save RAM
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30-day cache for remote Supabase and Unsplash assets
    imageSizes: [16, 32, 44, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "jdpuheeirybeiytusgjm.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vigqhnvaoszcffqvqmsg.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

