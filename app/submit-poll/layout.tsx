import type { Metadata } from "next";
import EmailNotificationReminder from "./EmailNotificationReminder";

const SITE_URL = "https://www.pollandsee.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Create a poll | Poll & See",
  description: "Create a poll in seconds. Share instantly. Anonymous and instant results.",
  alternates: {
    canonical: `${SITE_URL}/submit-poll`,
  },
  openGraph: {
    title: "Create a poll in seconds",
    description: "Share instantly. Anonymous and instant results.",
    url: `${SITE_URL}/submit-poll`,
    siteName: "Poll & See",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-submit.jpg?v=1`,
        width: 1200,
        height: 630,
        alt: "Create a poll in seconds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create a poll in seconds",
    description: "Share instantly. Anonymous and instant results.",
    images: [`${SITE_URL}/og-submit.jpg?v=1`],
  },
};

export default function SubmitPollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <EmailNotificationReminder />
    </>
  );
}
