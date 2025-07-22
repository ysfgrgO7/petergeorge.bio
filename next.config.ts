import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/home", // Your actual landing page component
      },
    ];
  },
};

export default nextConfig;
