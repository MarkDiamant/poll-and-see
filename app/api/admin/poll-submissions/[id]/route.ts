import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SubmissionUpdatePayload = {
  question?: string;
  description?: string;
  slug?: string;
  status?: "pending" | "ready";
  category?: string;
  is_private?: boolean;
  email?: string | null;
  options?: string[];
  option_image_urls?: string[];
};

type SubmissionRow = {
  id: number;
  poll_id: number | null;
  question: string;
  description: string | null;
  category: string | null;
  slug: string | null;
  status: "pending" | "ready";
  is_private: boolean | null;
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
    const submissionId = Number(id);

    if (!Number.isInteger(submissionId)) {
      return NextResponse.json({ error: "Invalid submission id." }, { status: 400 });
    }

    const body = (await request.json()) as SubmissionUpdatePayload;
    const supabaseAdmin = getAdminClient();

    const { data: existingSubmission, error: existingSubmissionError } = await supabaseAdmin
      .from("poll_submissions")
      .select("id, poll_id, question, description, category, slug, status, is_private")
      .eq("id", submissionId)
      .single();

    if (existingSubmissionError || !existingSubmission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const typedSubmission = existingSubmission as SubmissionRow;
    const updates: Record<string, unknown> = {};
    const pollUpdates: Record<string, unknown> = {};

    if ("question" in body) {
      const question = (body.question || "").trim();
      if (!question) {
        return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
      }
      updates.question = question;
      pollUpdates.question = question;
    }

    if ("description" in body) {
      const description = (body.description || "").trim();
      updates.description = description;
      pollUpdates.description = description;
    }

    if ("slug" in body) {
      const slug = (body.slug || "").trim();

      if (!slug) {
        return NextResponse.json({ error: "Slug cannot be empty." }, { status: 400 });
      }

      if (!isValidSlug(slug)) {
        return NextResponse.json(
          { error: "Slug must use lowercase letters, numbers, and hyphens only." },
          { status: 400 }
        );
      }

      const { data: duplicatePoll } = await supabaseAdmin
        .from("polls")
        .select("id")
        .eq("slug", slug)
        .neq("id", typedSubmission.poll_id || -1)
        .maybeSingle();

      if (duplicatePoll) {
        return NextResponse.json({ error: "Slug already exists." }, { status: 400 });
      }

      updates.slug = slug;
      pollUpdates.slug = slug;
    }

    if ("status" in body) {
      if (body.status !== "pending" && body.status !== "ready") {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      updates.status = body.status;
    }

    if ("category" in body) {
      const category = (body.category || "General").trim() || "General";
      updates.category = category;
      pollUpdates.category = category;
    }

    if ("is_private" in body) {
      const isPrivate = Boolean(body.is_private);
      updates.is_private = isPrivate;
      pollUpdates.is_private = isPrivate;
      pollUpdates.is_publicly_listed = !isPrivate;
    }

    if ("email" in body) {
      updates.email = (body.email || "").trim() || null;
    }

    if ("options" in body) {
      const options = (body.options || []).map((item) => item.trim()).filter(Boolean);

      if (options.length < 2) {
        return NextResponse.json({ error: "At least 2 options are required." }, { status: 400 });
      }

      updates.options = options;
    }

    if ("option_image_urls" in body) {
      const optionImageUrls = (body.option_image_urls || []).map((item) => item.trim());

      updates.option_image_urls = optionImageUrls.some(Boolean) ? optionImageUrls : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("poll_submissions")
      .update(updates)
      .eq("id", submissionId)
      .select("id, email, question, description, category, options, option_image_urls, is_private, slug, status, created_at, poll_id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Could not update submission." }, { status: 500 });
    }

    if (typedSubmission.poll_id) {
      const nextSlug =
        typeof pollUpdates.slug === "string"
          ? pollUpdates.slug
          : (data.slug || "");

      if (Object.keys(pollUpdates).length > 0) {
        await supabaseAdmin
          .from("polls")
          .update({
            ...pollUpdates,
            ...(nextSlug ? { full_url: `https://www.pollandsee.com/poll/${nextSlug}` } : {}),
          })
          .eq("id", typedSubmission.poll_id);
      }

      if ("options" in body || "option_image_urls" in body) {
const nextOptions = (data.options || [])
  .map((item: string) => item.trim())
  .filter(Boolean);

const nextImageUrls = (data.option_image_urls || [])
  .map((item: string | null) => (item || "").trim());

        const { data: existingOptions } = await supabaseAdmin
          .from("poll_options")
          .select("id, poll_id, option_text, image_url, vote_count")
          .eq("poll_id", typedSubmission.poll_id)
          .order("id", { ascending: true });

        const optionRows = existingOptions || [];

        const limit = Math.max(nextOptions.length, optionRows.length);

        for (let index = 0; index < limit; index += 1) {
          const existingOption = optionRows[index];
          const nextText = nextOptions[index];
          const nextImageUrl = nextImageUrls[index] || null;

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
                image_url: nextImageUrl,
                vote_count: 0,
              });
          }
        }
      }
    }

    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json({ error: "Could not update submission." }, { status: 500 });
  }
}

export async function DELETE(
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
      .select("id, poll_id")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    if (submission.poll_id) {
      await supabaseAdmin.from("poll_options").delete().eq("poll_id", submission.poll_id);
      await supabaseAdmin.from("polls").delete().eq("id", submission.poll_id);
    }

    const { error } = await supabaseAdmin
      .from("poll_submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      return NextResponse.json({ error: "Could not delete submission." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete submission." }, { status: 500 });
  }
}