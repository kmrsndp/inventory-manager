import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    nextScriptWorkers: false,
    reactCompiler: false,
  },
};

export default nextConfig;
