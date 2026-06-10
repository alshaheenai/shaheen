import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to the monorepo (avoids picking up a stray
  // lockfile in the home directory).
  turbopack: {
    root: path.resolve(__dirname, "..", ".."),
  },
};

export default nextConfig;
