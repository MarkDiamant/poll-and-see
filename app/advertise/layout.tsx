import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poll & See Advertising",
  description: "Put your business inside the conversation.",
  openGraph: {
    title: "Poll & See Advertising",
    description: "Put your business inside the conversation.",
    images: ["/og-advertise.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Poll & See Advertising",
    description: "Put your business inside the conversation.",
    images: ["/og-advertise.jpg"],
  },
};

export default function AdvertiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}