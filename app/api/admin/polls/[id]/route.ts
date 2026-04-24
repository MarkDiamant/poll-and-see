import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PollOptionUpdate = {
  id?: number | null;
  option_text: string;
  image_url?: string | null;
};

type PollUpdatePayload = {
  question?: string;
  description?: string;
  slug?: string;
  category?: string;
  is_private?: boolean;
  featured?: boolean;
  is_embeddable?: boolean;
  embed_active?: boolean;
  embed_voting_enabled?: boolean;
  option_updates?: PollOptionUpdate[];
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
    const supabaseAdmin = getAdminClient();

    if ("question" in body) {
      const question = (body.question || "").trim();
      if (!question) {
        return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
      }
      updates.question = question;
    }

    if ("description" in body) {
      updates.description = (body.description || "").trim();
    }

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

      const { data: duplicate } = await supabaseAdmin
        .from("polls")
        .select("id")
        .eq("slug", nextSlug)
        .neq("id", pollId)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json({ error: "Slug already exists." }, { status: 400 });
      }

      updates.slug = nextSlug;
      updates.full_url = `https://www.pollandsee.com/poll/${nextSlug}`;
    }

    if ("category" in body) {
      updates.category = (body.category || "General").trim() || "General";
    }

    if ("is_private" in body) {
      const isPrivate = Boolean(body.is_private);
      updates.is_private = isPrivate;
      updates.is_publicly_listed = !isPrivate;
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

    if ("option_updates" in body) {
      const optionUpdates = body.option_updates || [];

      const validOptions = optionUpdates
        .map((item) => ({
          id: item.id ?? null,
          option_text: (item.option_text || "").trim(),
          image_url: (item.image_url || "").trim() || null,
        }))
        .filter((item) => item.option_text);

      if (validOptions.length < 2) {
        return NextResponse.json({ error: "At least 2 options are required." }, { status: 400 });
      }

      const { data: existingOptions } = await supabaseAdmin
        .from("poll_options")
        .select("id, poll_id")
        .eq("poll_id", pollId);

      const existingIds = new Set((existingOptions || []).map((item) => item.id));

      for (const option of validOptions) {
        if (option.id && existingIds.has(option.id)) {
          await supabaseAdmin
            .from("poll_options")
            .update({
              option_text: option.option_text,
              image_url: option.image_url,
            })
            .eq("id", option.id)
            .eq("poll_id", pollId);
        } else if (!option.id) {
          await supabaseAdmin
            .from("poll_options")
            .insert({
              poll_id: pollId,
              option_text: option.option_text,
              image_url: option.image_url,
              vote_count: 0,
            });
        }
      }

      const optionTexts = validOptions.map((item) => item.option_text);
      const optionImageUrls = validOptions.map((item) => item.image_url || "");

      await supabaseAdmin
        .from("poll_submissions")
        .update({
          options: optionTexts,
          option_image_urls: optionImageUrls.some(Boolean) ? optionImageUrls : null,
        })
        .eq("poll_id", pollId);
    }

    if ("featured" in body && body.featured === true) {
  await supabaseAdmin
    .from("polls")
    .update({ featured: false })
    .neq("id", pollId);
}

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("polls")
        .update(updates)
        .eq("id", pollId);

      if (updateError) {
        return NextResponse.json({ error: "Could not update poll." }, { status: 500 });
      }

      const submissionSyncUpdates: Record<string, unknown> = {};

      if ("question" in updates) submissionSyncUpdates.question = updates.question;
      if ("description" in updates) submissionSyncUpdates.description = updates.description;
      if ("slug" in updates) submissionSyncUpdates.slug = updates.slug;
      if ("category" in updates) submissionSyncUpdates.category = updates.category;
      if ("is_private" in updates) submissionSyncUpdates.is_private = updates.is_private;

      if (Object.keys(submissionSyncUpdates).length > 0) {
        await supabaseAdmin
          .from("poll_submissions")
          .update(submissionSyncUpdates)
          .eq("poll_id", pollId);
      }
    }

    const [{ data: pollData, error: pollError }, { data: optionsData, error: optionsError }] =
      await Promise.all([
        supabaseAdmin
          .from("polls")
          .select(
            "id, question, description, category, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed"
          )
          .eq("id", pollId)
          .single(),
        supabaseAdmin
          .from("poll_options")
          .select("id, poll_id, option_text, image_url, vote_count")
          .eq("poll_id", pollId)
          .order("id", { ascending: true }),
      ]);

    if (pollError || !pollData || optionsError) {
      return NextResponse.json({ error: "Could not update poll." }, { status: 500 });
    }

    return NextResponse.json({
      poll: {
        ...pollData,
        options: optionsData || [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not update poll." }, { status: 500 });
  }
}