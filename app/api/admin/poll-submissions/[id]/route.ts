import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SubmissionUpdatePayload = {
  question?: string;
  description?: string;
  slug?: string;
  status?: "pending" | "ready";
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
        .maybeSingle();

      if (duplicatePoll) {
        return NextResponse.json({ error: "Slug already exists." }, { status: 400 });
      }

      updates.slug = slug;
    }

    if ("status" in body) {
      if (body.status !== "pending" && body.status !== "ready") {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("poll_submissions")
      .update(updates)
      .eq("id", submissionId)
      .select("id, email, question, description, category, options, option_image_urls, is_private, slug, status, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Could not update submission." }, { status: 500 });
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