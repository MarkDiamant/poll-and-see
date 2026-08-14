import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
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

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")?.trim();
  const requestedRegion = request.nextUrl.searchParams.get("region")?.trim();

  const region =
    requestedRegion === "UK" || requestedRegion === "US" || requestedRegion === "All"
      ? requestedRegion
      : "UK";

  if (!category) {
    return NextResponse.json({ sponsor: null });
  }

  const now = new Date().toISOString();
  const supabaseAdmin = getAdminClient();

  const { data, error } = await supabaseAdmin
    .from("sponsors")
    .select("id, business_name, headline, logo_url, cta_text, destination_url, theme, category, region")
    .eq("is_active", true)
    .lte("start_at", now)
    .gt("end_at", now)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message, sponsor: null },
      { status: 500 }
    );
  }

  const sponsor =
    data?.find((item) => {
      const categories = String(item.category || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      const sponsorRegion = String(item.region || "Universal");

      const regionMatches =
        region === "All" ||
        sponsorRegion === "Universal" ||
        sponsorRegion === region;

      return categories.includes(category.toLowerCase()) && regionMatches;
    }) || null;

  return NextResponse.json({ sponsor });
}