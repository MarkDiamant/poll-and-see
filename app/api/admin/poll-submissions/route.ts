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

function getBaseUrl(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.pollandsee.com";
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
      .from("poll_submissions")
      .select("id, poll_id, email, question, description, category, options, option_image_urls, is_private, status, created_at")
      .order("created_at", { ascending: false });

    if (search) {
      const safeSearch = search.replace(/[%(),]/g, " ");
      query = query.or(
        `question.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
      );
    }

    const [
      { data, error },
      { data: pollRows, error: pollRowsError },
      livePollCountResult,
    ] = await Promise.all([
      query,
      supabaseAdmin.from("polls").select("id, slug"),
      supabaseAdmin.from("polls").select("id", { count: "exact", head: true }),
    ]);

    if (error || pollRowsError) {
      return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
    }

    const slugByPollId = new Map<number, string>();
    (pollRows || []).forEach((row) => {
      if (row.slug) {
        slugByPollId.set(row.id, row.slug);
      }
    });

    const submissions = (data || []).map((row) => ({
      ...row,
      slug: row.poll_id ? slugByPollId.get(row.poll_id) || null : null,
    }));

    return NextResponse.json({
      submissions,
      livePollCount: livePollCountResult.count || 0,
    });
  } catch {
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabaseAdmin = getAdminClient();
    const body = await request.json();

    const question = String(body.question || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "General").trim() || "General";
    const is_private = Boolean(body.is_private);
    const options = Array.isArray(body.options)
      ? body.options.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : [];
    const option_image_urls = Array.isArray(body.option_image_urls)
  ? body.option_image_urls.map((item: unknown) => String(item || "").trim())
  : [];

const hasAnyImageUrls = option_image_urls.some(Boolean);
const cleanedImageUrls = hasAnyImageUrls ? option_image_urls : [];

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    if (question.length > 150) {
      return NextResponse.json({ error: "Question must be 150 characters or fewer." }, { status: 400 });
    }

    if (description.length > 200) {
      return NextResponse.json({ error: "Description must be 200 characters or fewer." }, { status: 400 });
    }

    if (options.length < 2) {
      return NextResponse.json({ error: "At least 2 options are required." }, { status: 400 });
    }

    if (options.length > 6) {
      return NextResponse.json({ error: "Maximum 6 options allowed." }, { status: 400 });
    }

    if (options.some((option: string) => option.length > 40)) {
      return NextResponse.json({ error: "Each option must be 40 characters or fewer." }, { status: 400 });
    }

   if (cleanedImageUrls.length > 0 && cleanedImageUrls.length !== options.length) {
  return NextResponse.json(
    { error: "If image URLs are used, every option must include one." },
    { status: 400 }
  );
}

    const slug = await generateUniqueSlug(supabaseAdmin);
    const baseUrl = getBaseUrl(request);
    const pollUrl = `${baseUrl}/poll/${slug}`;

    const { data: insertedPoll, error: pollInsertError } = await supabaseAdmin
      .from("polls")
      .insert({
        question,
        description,
        category,
        slug,
        featured: false,
        is_private,
        is_publicly_listed: false,
        total_votes: 0,
        full_url: pollUrl,
      })
      .select("id, slug")
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
      image_url: cleanedImageUrls[index] || null,
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

    const { data: submission, error: submissionInsertError } = await supabaseAdmin
      .from("poll_submissions")
      .insert({
        poll_id: insertedPoll.id,
        name: null,
        email: null,
        question,
        description: description || null,
        category,
        options,
        option_image_urls: cleanedImageUrls.length > 0 ? cleanedImageUrls : null,
        is_private,
        status: "pending",
      })
      .select("id, poll_id, email, question, description, category, options, option_image_urls, is_private, status, created_at")
      .single();

    if (submissionInsertError || !submission) {
  await supabaseAdmin.from("poll_options").delete().eq("poll_id", insertedPoll.id);
  await supabaseAdmin.from("polls").delete().eq("id", insertedPoll.id);
  return NextResponse.json(
    { error: submissionInsertError?.message || "Could not create submission." },
    { status: 500 }
  );
}

    return NextResponse.json({
      submission: {
        ...submission,
        slug,
      },
      pollUrl,
      slug,
    });
  } catch (error) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Could not create submission." },
    { status: 500 }
  );
}
}