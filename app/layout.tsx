import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poll & See",
  description:
    "Create and vote on opinion polls across business, finance, education, lifestyle and community topics. See what people really think.",
  icons: {
    icon: "/favicon.ico",
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