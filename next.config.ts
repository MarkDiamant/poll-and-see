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
      // Keep previously shared links working after standardising poll slugs.
      { source: "/poll/uk-eu-free-movement-20261025", destination: "/poll/daadc6", permanent: true },
      { source: "/poll/should-parents-track-childrens-location-20261024", destination: "/poll/e6e602", permanent: true },
      { source: "/poll/permanent-summer-or-winter-time-20280326", destination: "/poll/513e1e", permanent: true },
      { source: "/poll/lighter-mornings-or-evenings-20271029", destination: "/poll/63bbd2", permanent: true },
      { source: "/poll/stop-changing-clocks-20270328", destination: "/poll/d887e8", permanent: true },
      { source: "/poll/clocks-back-parents-20261023", destination: "/poll/31c53f", permanent: true },
      { source: "/poll/home-landline-or-mobile-20261202", destination: "/poll/f869c1", permanent: true },
      { source: "/poll/family-comfort-cold-choice-20261201", destination: "/poll/8bb3ad", permanent: true },
      { source: "/poll/ai-retraining-1106", destination: "/poll/5cafaf", permanent: true },
      { source: "/poll/parking-registration-fine-20261020", destination: "/poll/c0757e", permanent: true },
      { source: "/poll/siblings-at-wedding-20261017", destination: "/poll/e9f30f", permanent: true },
    ];
  },
};

export default nextConfig;
