import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAuthorized(request: NextRequest) {
  return request.headers.get("x-admin-key") === process.env.POLL_ADMIN_KEY;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  const { data } = await supabase
    .from("poll_submissions")
    .select("id, poll_id, email, question, description, category, options, option_image_urls, is_private, status, created_at")
    .eq("status", "hidden")
    .order("created_at", { ascending: false });

  const pollIds = (data || [])
    .map((item) => item.poll_id)
    .filter((id): id is number => typeof id === "number");

  let pollMetaById = new Map<number, { slug: string | null; embed_token: string | null; submitter_email: string | null }>();

  if (pollIds.length > 0) {
    const { data: pollRows } = await supabase
      .from("polls")
      .select("id, slug, embed_token, submitter_email")
      .in("id", pollIds);

    pollMetaById = new Map(
      (pollRows || []).map((poll) => [
        poll.id,
        {
          slug: poll.slug || null,
          embed_token: poll.embed_token || null,
          submitter_email: poll.submitter_email || null,
        },
      ])
    );
  }

  const items = (data || []).map((item) => ({
    ...item,
    email: item.email || (item.poll_id ? pollMetaById.get(item.poll_id)?.submitter_email || null : null),
    slug: item.poll_id ? pollMetaById.get(item.poll_id)?.slug || null : null,
    embed_token: item.poll_id ? pollMetaById.get(item.poll_id)?.embed_token || null : null,
  }));

  return NextResponse.json({ items });
}
