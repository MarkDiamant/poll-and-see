import "./globals.css";
import type { Metadata } from "next";

const SITE_URL = "https://www.pollandsee.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Poll & See",
  description:
    "Create polls in seconds. Vote instantly. See what people really think.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Poll & See",
    description:
      "Create polls in seconds. Vote instantly. See what people really think.",
    url: SITE_URL,
    siteName: "Poll & See",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-homepage.jpg?v=1`,
        width: 1200,
        height: 630,
        alt: "Poll & See",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Poll & See",
    description:
      "Create polls in seconds. Vote instantly. See what people really think.",
    images: [`${SITE_URL}/og-homepage.jpg?v=1`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}