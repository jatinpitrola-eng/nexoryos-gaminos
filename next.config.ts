import type { NextConfig } from "next";

const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  // Keep standalone output for self-hosting (sandbox/VM); Vercel uses its own builder.
  ...(isVercel ? {} : { output: "standalone" }),
  // Ship the seeded SQLite database inside serverless bundles so the app can
  // copy it to a writable location at runtime (see src/lib/db.ts).
  outputFileTracingIncludes: {
    "/**": ["./db/custom.db"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
