import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker (.next/standalone/apps/web/server.js).
  output: "standalone",
  // Trace files from the monorepo root so the standalone bundle includes
  // workspace-hoisted dependencies.
  outputFileTracingRoot: path.resolve(__dirname, "..", ".."),
  // Pin the workspace root to the monorepo (avoids picking up a stray
  // lockfile in the home directory).
  turbopack: {
    root: path.resolve(__dirname, "..", ".."),
  },
};

export default nextConfig;
