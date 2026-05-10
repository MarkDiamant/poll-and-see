import type { Metadata } from "next";

const SITE_URL = "https://www.pollandsee.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Your results | Poll & See",
  description: "See the results and reactions for polls you’ve voted on.",
  alternates: {
    canonical: `${SITE_URL}/results`,
  },
  openGraph: {
    title: "Your results",
    description: "See the results and reactions for polls you’ve voted on.",
    url: `${SITE_URL}/results`,
    siteName: "Poll & See",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-results.png?v=1`,
        width: 1200,
        height: 630,
        alt: "Your results",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your results",
    description: "See the results and reactions for polls you’ve voted on.",
    images: [`${SITE_URL}/og-results.png?v=1`],
  },
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}