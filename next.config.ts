import type { NextConfig } from "next";

// In development the Python API runs on port 8000. On Vercel, /api/py/* is
// served by the Python function in api/index.py.
const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/api/py/:path*",
      destination:
        process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:8000/api/py/:path*"
          : "/api/",
    },
  ],
};

export default nextConfig;
