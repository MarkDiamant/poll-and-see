import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseServerClient();

  const { data: polls } = await supabase
    .from("polls")
    .select("slug, created_at")
    .eq("is_private", false)
    .eq("is_publicly_listed", true)
    .order("created_at", { ascending: false });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/submit-poll`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const pollPages: MetadataRoute.Sitemap = (polls || []).map((poll) => ({
    url: `${SITE_URL}/poll/${poll.slug}`,
    lastModified: poll.created_at ? new Date(poll.created_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...pollPages];
}