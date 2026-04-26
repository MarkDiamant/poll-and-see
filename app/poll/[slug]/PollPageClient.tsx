import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PollPageClient from "./PollPageClient";

const SITE_URL = "https://www.pollandsee.com";
const DESCRIPTION = "Vote and see what others think";

function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("polls")
    .select("question, slug")
    .eq("slug", slug)
    .maybeSingle();

  const title = data?.question || "Poll & See";
  const imageUrl = `${SITE_URL}/api/og?slug=${encodeURIComponent(slug)}`;
  const pageUrl = `${SITE_URL}/poll/${encodeURIComponent(slug)}`;

  return {
    title,
    description: DESCRIPTION,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description: DESCRIPTION,
      url: pageUrl,
      siteName: "Poll & See",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: DESCRIPTION,
      images: [imageUrl],
    },
  };
}

export default function PollPage() {
  return <PollPageClient />;
}