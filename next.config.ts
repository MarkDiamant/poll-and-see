import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "pollandsee.com",
          },
        ],
        destination: "https://www.pollandsee.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
