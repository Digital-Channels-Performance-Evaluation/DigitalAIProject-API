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

    return [
      /**
       * Forward /api/:path* → backend /api/:path*
       *
       * FastAPI expects a trailing slash on collection routes (e.g. /rankings/).
       * Rather than fighting with 307/308 redirects (which strip Authorization),
       * we proxy directly to the backend and let Axios handle URL construction.
       *
       * The Axios interceptor in lib/api.ts strips trailing slashes from request
       * URLs before they reach the proxy, preventing redirect loops.
       */
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
