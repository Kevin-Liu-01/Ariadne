import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-postgres pulls in optional native bits (pg-native) it never needs here;
  // keep it external so the bundler doesn't trace them into the route handlers.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
