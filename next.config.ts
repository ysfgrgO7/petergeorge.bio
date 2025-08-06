import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [];
  },
  output: "export",
};

export default nextConfig;
