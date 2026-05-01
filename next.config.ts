import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    resolveAlias: {
      child_process: "./lib/empty-module.ts",
      "fs/promises": "./lib/empty-module.ts",
    },
  },
};

export default nextConfig;
