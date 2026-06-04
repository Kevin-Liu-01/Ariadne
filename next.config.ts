import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-postgres pulls in optional native bits (pg-native) it never needs here;
  // keep it external so the bundler doesn't trace them into the route handlers.
  serverExternalPackages: ["pg"],
  // The waitlist CSV is read at runtime via fs; force-include it in the bundle so
  // the door gate works on Vercel's serverless functions.
  outputFileTracingIncludes: {
    "/api/**": ["./src/server/door/waitlist.csv"],
  },
  // Save-contact lives on the check-in page now; keep the old QR/link target alive.
  async redirects() {
    return [{ source: "/sms", destination: "/join", permanent: true }];
  },
};

export default nextConfig;
