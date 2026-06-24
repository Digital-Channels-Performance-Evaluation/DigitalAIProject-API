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
      // /.well-known probes return instantly without touching the backend
      beforeFiles: [
        {
          source: "/.well-known/:path*",
          destination: "/api/noop",
        },
      ],
      afterFiles: [
        // Proxy avatar/upload images served by the backend's static file handler.
        // /api/* is handled by app/api/[...path]/route.ts (catches backend errors properly).
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
