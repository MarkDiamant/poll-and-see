import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isAuthorized(request: NextRequest) {
  const expectedKey = process.env.POLL_ADMIN_KEY;
  const providedKey = request.headers.get("x-admin-key");

  if (!expectedKey) {
    return { ok: false, error: "POLL_ADMIN_KEY is not configured." };
  }

  if (!providedKey || providedKey !== expectedKey) {
    return { ok: false, error: "Unauthorized." };
  }

  return { ok: true };
}

export async function GET(request: NextRequest) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabaseAdmin = getAdminClient();
    const search = request.nextUrl.searchParams.get("q")?.trim() || "";

    let query = supabaseAdmin
      .from("polls")
      .select(
        "id, question, description, category, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed"
      )
      .order("created_at", { ascending: false });

    if (search) {
      const safeSearch = search.replace(/[%(),]/g, " ");
      query = query.or(
        `question.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%`
      );
    }

    const [
      { data: pollsData, error: pollsError },
      { data: slugRows, error: slugError },
      { data: optionRows, error: optionError },
      submissionsCountResult,
    ] = await Promise.all([
      query,
      supabaseAdmin.from("polls").select("id, slug").not("slug", "is", null),
      supabaseAdmin
        .from("poll_options")
        .select("id, poll_id, option_text, image_url, vote_count")
        .order("poll_id", { ascending: true })
        .order("id", { ascending: true }),
      supabaseAdmin.from("poll_submissions").select("id", { count: "exact", head: true }),
    ]);

    if (pollsError || slugError || optionError) {
      return NextResponse.json({ error: "Could not load polls." }, { status: 500 });
    }

    const optionsByPoll = new Map<number, Array<{
      id: number;
      poll_id: number;
      option_text: string;
      image_url: string | null;
      vote_count: number;
    }>>();

    (optionRows || []).forEach((row) => {
      const existing = optionsByPoll.get(row.poll_id) || [];
      existing.push(row);
      optionsByPoll.set(row.poll_id, existing);
    });

    const polls = (pollsData || []).map((poll) => ({
      ...poll,
      options: optionsByPoll.get(poll.id) || [],
    }));

    return NextResponse.json({
      polls,
      allSlugs: (slugRows || [])
        .filter((row) => row.slug)
        .map((row) => ({ id: row.id, slug: row.slug as string })),
      pendingSubmissionsCount: submissionsCountResult.count || 0,
    });
  } catch {
    return NextResponse.json({ error: "Could not load polls." }, { status: 500 });
  }
}