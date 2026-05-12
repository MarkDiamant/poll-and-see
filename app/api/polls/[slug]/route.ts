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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await context.params;
  const slug = rawSlug.replace(/^\/+/, "").trim();

  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const supabaseAdmin = getAdminClient();

  const { data: poll, error: pollError } = await supabaseAdmin
    .from("polls")
    .select("id, question, description, category, slug, is_private, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (pollError || !poll) {
    return NextResponse.json({ error: "Poll not found." }, { status: 404 });
  }

  const { data: options, error: optionsError } = await supabaseAdmin
    .from("poll_options")
    .select("id, poll_id, option_text, vote_count, image_url")
    .eq("poll_id", poll.id)
    .order("id", { ascending: true });

  if (optionsError) {
    return NextResponse.json({ error: "Could not load poll options." }, { status: 500 });
  }

  return NextResponse.json({
    poll,
    options: options || [],
  });
}