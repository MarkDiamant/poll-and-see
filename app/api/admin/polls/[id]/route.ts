import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PollUpdatePayload = {
  slug?: string;
  is_private?: boolean;
  featured?: boolean;
  is_embeddable?: boolean;
  embed_active?: boolean;
  embed_voting_enabled?: boolean;
};

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

function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const pollId = Number(id);

    if (!Number.isInteger(pollId)) {
      return NextResponse.json({ error: "Invalid poll id." }, { status: 400 });
    }

    const body = (await request.json()) as PollUpdatePayload;
    const updates: Record<string, unknown> = {};

    if ("slug" in body) {
      const nextSlug = (body.slug || "").trim();

      if (!nextSlug) {
        return NextResponse.json({ error: "Slug cannot be empty." }, { status: 400 });
      }

      if (!isValidSlug(nextSlug)) {
        return NextResponse.json(
          { error: "Slug must use lowercase letters, numbers, and hyphens only." },
          { status: 400 }
        );
      }

      updates.slug = nextSlug;
    }

    if ("is_private" in body) {
      updates.is_private = Boolean(body.is_private);
    }

    if ("featured" in body) {
      updates.featured = Boolean(body.featured);
    }

    if ("is_embeddable" in body) {
      updates.is_embeddable = Boolean(body.is_embeddable);
    }

    if ("embed_active" in body) {
      updates.embed_active = Boolean(body.embed_active);
    }

    if ("embed_voting_enabled" in body) {
      updates.embed_voting_enabled = Boolean(body.embed_voting_enabled);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from("polls")
      .update(updates)
      .eq("id", pollId)
      .select(
        "id, question, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at"
      )
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Could not update poll." }, { status: 500 });
    }

    return NextResponse.json({ poll: data });
  } catch {
    return NextResponse.json({ error: "Could not update poll." }, { status: 500 });
  }
}