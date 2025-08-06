import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [];
  },
  output: "export",
  basePath: "/petergeorge.bio",
};

export default nextConfig;
