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

  if (!category) {
    return NextResponse.json({ sponsor: null });
  }

  const now = new Date().toISOString();
  const supabaseAdmin = getAdminClient();

  const { data, error } = await supabaseAdmin
    .from("sponsors")
    .select("id, business_name, headline, logo_url, cta_text, destination_url, theme, category")
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

      return categories.includes(category.toLowerCase());
    }) || null;

  return NextResponse.json({ sponsor });
}