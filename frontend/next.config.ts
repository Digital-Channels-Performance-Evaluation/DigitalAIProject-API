import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".build",
  output: "standalone",
  images: { unoptimized: true },

  async rewrites() {
    const backend =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";

    return {
      // Run BEFORE the catch-all proxy so /.well-known never hits the backend
      beforeFiles: [
        {
          source: "/.well-known/:path*",
          destination: "/api/noop",  // handled below — returns instantly
        },
      ],
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${backend}/api/:path*`,
        },
        // Proxy avatar images served by the backend's static file handler
        {
          source: "/uploads/:path*",
          destination: `${backend}/uploads/:path*`,
        },
      ],
      fallback: [],
    };
  },

  async headers() {
    return [
      // Cache static assets aggressively — reduces repeat load time
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
