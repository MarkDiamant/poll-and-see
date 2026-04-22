import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SubmissionRow = {
  id: number;
  poll_id: number | null;
  email: string | null;
  question: string;
  description: string | null;
  category: string | null;
  options: string[] | null;
  option_image_urls: string[] | null;
  is_private: boolean | null;
  slug: string | null;
  status: "pending" | "ready";
  created_at: string | null;
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

function createSlugFromQuestion(question: string) {
  return question
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const submissionId = Number(id);

    if (!Number.isInteger(submissionId)) {
      return NextResponse.json({ error: "Invalid submission id." }, { status: 400 });
    }

    const body = (await request.json()) as { slug?: string };
    const supabaseAdmin = getAdminClient();

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("poll_submissions")
      .select("id, poll_id, email, question, description, category, options, option_image_urls, is_private, slug, status, created_at")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const typedSubmission = submission as SubmissionRow;
    const slug = (body.slug || typedSubmission.slug || createSlugFromQuestion(typedSubmission.question)).trim();

    if (!slug) {
      return NextResponse.json({ error: "Slug is required." }, { status: 400 });
    }

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "Slug must use lowercase letters, numbers, and hyphens only." },
        { status: 400 }
      );
    }

    if (typedSubmission.poll_id) {
      const { data: existingPoll } = await supabaseAdmin
        .from("polls")
        .select("id")
        .eq("slug", slug)
        .neq("id", typedSubmission.poll_id)
        .maybeSingle();

      if (existingPoll) {
        return NextResponse.json({ error: "Slug already exists." }, { status: 400 });
      }

      const { data: updatedPoll, error: pollUpdateError } = await supabaseAdmin
        .from("polls")
        .update({
          question: typedSubmission.question,
          description: typedSubmission.description || "",
          category: typedSubmission.category || "General",
          slug,
          is_private: Boolean(typedSubmission.is_private),
          is_publicly_listed: !Boolean(typedSubmission.is_private),
          full_url: `https://www.pollandsee.com/poll/${slug}`,
        })
        .eq("id", typedSubmission.poll_id)
        .select(
          "id, question, description, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed"
        )
        .single();

      if (pollUpdateError || !updatedPoll) {
        return NextResponse.json({ error: "Could not publish submission." }, { status: 500 });
      }

      const { error: deleteSubmissionError } = await supabaseAdmin
        .from("poll_submissions")
        .delete()
        .eq("id", submissionId);

      if (deleteSubmissionError) {
        return NextResponse.json(
          { error: "Poll published, but submission could not be removed. Please delete it manually." },
          { status: 500 }
        );
      }

      return NextResponse.json({ poll: updatedPoll });
    }

    const { data: existingPoll } = await supabaseAdmin
      .from("polls")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingPoll) {
      return NextResponse.json({ error: "Slug already exists." }, { status: 400 });
    }

    const options = typedSubmission.options || [];
    const optionImageUrls = typedSubmission.option_image_urls || [];

    if (options.length < 2) {
      return NextResponse.json({ error: "Submission must have at least 2 options." }, { status: 400 });
    }

    const { data: insertedPoll, error: pollInsertError } = await supabaseAdmin
      .from("polls")
      .insert({
        question: typedSubmission.question,
        description: typedSubmission.description || "",
        category: typedSubmission.category || "General",
        slug,
        featured: false,
        is_private: Boolean(typedSubmission.is_private),
        is_publicly_listed: !Boolean(typedSubmission.is_private),
        total_votes: 0,
        full_url: `https://www.pollandsee.com/poll/${slug}`,
      })
      .select(
        "id, question, description, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed"
      )
      .single();

    if (pollInsertError || !insertedPoll) {
      return NextResponse.json({ error: "Could not create poll." }, { status: 500 });
    }

    const optionRows = options.map((optionText, index) => ({
      poll_id: insertedPoll.id,
      option_text: optionText,
      vote_count: 0,
      image_url: optionImageUrls[index] || null,
    }));

    const { error: optionsInsertError } = await supabaseAdmin
      .from("poll_options")
      .insert(optionRows);

    if (optionsInsertError) {
      await supabaseAdmin.from("polls").delete().eq("id", insertedPoll.id);
      return NextResponse.json({ error: "Could not create poll options." }, { status: 500 });
    }

    const { error: deleteSubmissionError } = await supabaseAdmin
      .from("poll_submissions")
      .delete()
      .eq("id", submissionId);

    if (deleteSubmissionError) {
      return NextResponse.json(
        { error: "Poll created, but submission could not be removed. Please delete it manually." },
        { status: 500 }
      );
    }

    return NextResponse.json({ poll: insertedPoll });
  } catch {
    return NextResponse.json({ error: "Could not approve submission." }, { status: 500 });
  }
}