import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [];
  },
  output: "export",
  basePath: "/",
  // basePath: process.env.PAGES_BASE_PATH,
};

export default nextConfig;
