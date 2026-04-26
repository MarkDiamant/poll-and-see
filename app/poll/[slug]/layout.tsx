// app/poll/[slug]/layout.tsx import { createClient } from "@supabase/supabase-js"; import type { Metadata } from "next"; const SITE_URL = "https://www.pollandsee.com"; function getSupabaseServerClient() { return createClient( process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!, { auth: { persistSession: false, autoRefreshToken: false, }, } ); } export async function generateMetadata({ params, }: { params: Promise<{ slug: string }>; }): Promise<Metadata> { const { slug } = await params; const supabase = getSupabaseServerClient(); const { data } = await supabase .from("polls") .select("question") .eq("slug", slug) .maybeSingle(); const title = data?.question || "Poll & See"; const description = "Vote and see what others think"; const imageUrl = ${SITE_URL}/api/og?slug=${slug}; return { title, description, openGraph: { title, description, images: [ { url: imageUrl, width: 1200, height: 630, alt: title, }, ], }, twitter: { card: "summary_large_image", title, description, images: [imageUrl], }, }; } export default function PollLayout({ children, }: { children: React.ReactNode; }) { return children; }// app/poll/[slug]/layout.tsx

import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

const SITE_URL = "https://www.pollandsee.com";

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
    .select("question")
    .eq("slug", slug)
    .maybeSingle();

  const title = data?.question || "Poll & See";
  const description = "Vote and see what others think";
  const imageUrl = `${SITE_URL}/api/og?slug=${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
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