import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root for Turbopack so dev server ignores parent lockfiles.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
