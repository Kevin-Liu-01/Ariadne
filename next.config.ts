import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the bundler so route
  // handlers load the compiled binding at runtime instead of being traced.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
