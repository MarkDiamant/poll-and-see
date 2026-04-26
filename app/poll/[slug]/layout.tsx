import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

const SITE_URL = "https://www.pollandsee.com";

function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
const { slug: rawSlug } = await params;
const slug = rawSlug.replace(/^\/+/, "");
  const cleanSlug = slug.trim();

  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("polls")
    .select("question")
    .eq("slug", cleanSlug)
    .maybeSingle();

  const title = data?.question || "Poll & See";
  const description = "Vote and see what others think";
const imageUrl = `${SITE_URL}/api/og/${encodeURIComponent(cleanSlug)}`;

return {
  metadataBase: new URL(SITE_URL),
  title,
  description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/poll/${cleanSlug}`,
      siteName: "Poll & See",
      type: "website",
      images: [
{
  url: imageUrl,
  secureUrl: imageUrl,
  width: 1200,
  height: 630,
  alt: title,
  type: "image/png",
},
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function PollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}