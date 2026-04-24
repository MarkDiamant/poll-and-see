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

function generateShortId(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

async function generateUniqueSlug(supabaseAdmin: ReturnType<typeof getAdminClient>) {
  for (let i = 0; i < 20; i += 1) {
    const candidate = generateShortId(6);

    const { data: existingPoll } = await supabaseAdmin
      .from("polls")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!existingPoll) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique short ID.");
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

    const supabaseAdmin = getAdminClient();

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("poll_submissions")
      .select("id, poll_id, email, question, description, category, options, option_image_urls, is_private, status, created_at")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const typedSubmission = submission as SubmissionRow;

    if (typedSubmission.poll_id) {
      const { data: existingPoll, error: existingPollError } = await supabaseAdmin
        .from("polls")
        .select(
          "id, question, description, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed"
        )
        .eq("id", typedSubmission.poll_id)
        .single();

      if (existingPollError || !existingPoll) {
        return NextResponse.json({ error: "Linked poll not found." }, { status: 404 });
      }

const { data: updatedPoll, error: pollUpdateError } = await supabaseAdmin
  .from("polls")
  .update({
    question: typedSubmission.question,
    description: typedSubmission.description || "",
    category: typedSubmission.category || "General",
    is_private: Boolean(typedSubmission.is_private),
    is_publicly_listed: !Boolean(typedSubmission.is_private),
created_at: new Date().toISOString(),
  })
        .eq("id", typedSubmission.poll_id)
        .select(
          "id, question, description, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed"
        )
        .single();

      if (pollUpdateError || !updatedPoll) {
  return NextResponse.json(
    { error: pollUpdateError?.message || "Could not approve submission." },
    { status: 500 }
  );
}

      const options = typedSubmission.options || [];
      const optionImageUrls = typedSubmission.option_image_urls || [];

      if (options.length < 2) {
        return NextResponse.json({ error: "Submission must have at least 2 options." }, { status: 400 });
      }

      const { data: existingOptions } = await supabaseAdmin
        .from("poll_options")
        .select("id")
        .eq("poll_id", typedSubmission.poll_id)
        .order("id", { ascending: true });

      const optionRows = existingOptions || [];
      const limit = Math.max(options.length, optionRows.length);

      for (let index = 0; index < limit; index += 1) {
        const existingOption = optionRows[index];
        const nextText = options[index];
        const nextImageUrl = optionImageUrls[index] || null;

        if (existingOption && nextText) {
          await supabaseAdmin
            .from("poll_options")
            .update({
              option_text: nextText,
              image_url: nextImageUrl,
            })
            .eq("id", existingOption.id);
        } else if (!existingOption && nextText) {
          await supabaseAdmin
            .from("poll_options")
            .insert({
              poll_id: typedSubmission.poll_id,
              option_text: nextText,
              vote_count: 0,
              image_url: nextImageUrl,
            });
        } else if (existingOption && !nextText) {
          await supabaseAdmin.from("poll_options").delete().eq("id", existingOption.id);
        }
      }

      const { error: deleteSubmissionError } = await supabaseAdmin
        .from("poll_submissions")
        .delete()
        .eq("id", submissionId);

      if (deleteSubmissionError) {
        return NextResponse.json(
          { error: "Poll approved, but submission could not be removed. Please delete it manually." },
          { status: 500 }
        );
      }

      return NextResponse.json({ poll: updatedPoll });
    }

    const slug = await generateUniqueSlug(supabaseAdmin);
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
created_at: new Date().toISOString(),
      })
      .select(
        "id, question, description, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed"
      )
      .single();

    if (pollInsertError || !insertedPoll) {
  return NextResponse.json(
    { error: pollInsertError?.message || "Could not create poll." },
    { status: 500 }
  );
}

    const optionRows = options.map((optionText: string, index: number) => ({
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
  return NextResponse.json(
    { error: optionsInsertError.message || "Could not create poll options." },
    { status: 500 }
  );
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
  } catch (error) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Could not approve submission." },
    { status: 500 }
  );
}
}