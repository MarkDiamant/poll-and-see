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
        "id, question, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at"
      )
      .order("created_at", { ascending: false });

    if (search) {
      const safeSearch = search.replace(/[%(),]/g, " ");
      query = query.or(`question.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Could not load polls." }, { status: 500 });
    }

    return NextResponse.json({ polls: data || [] });
  } catch {
    return NextResponse.json({ error: "Could not load polls." }, { status: 500 });
  }
}