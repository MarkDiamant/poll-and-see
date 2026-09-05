import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
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

  const [{ data: polls, error: pollsError }, { data: submissions, error: submissionsError }] =
    await Promise.all([
      supabase
        .from("polls")
        .select("id, question, slug, is_publicly_listed, submitter_email")
        .not("submitter_email", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("poll_submissions")
        .select("id, poll_id, question, email, status")
        .not("email", "is", null)
        .order("created_at", { ascending: false }),
    ]);

  if (pollsError || submissionsError) {
    return NextResponse.json({ error: "Could not load submitter emails." }, { status: 500 });
  }

  const byPollId = new Map<number, { poll_id: number; question: string; email: string; status: string }>();

  for (const poll of polls || []) {
    if (!poll.submitter_email) continue;
    byPollId.set(Number(poll.id), {
      poll_id: Number(poll.id),
      question: poll.question,
      email: poll.submitter_email,
      status: poll.is_publicly_listed ? "live" : "not live",
    });
  }

  for (const submission of submissions || []) {
    if (!submission.email || !submission.poll_id) continue;
    byPollId.set(Number(submission.poll_id), {
      poll_id: Number(submission.poll_id),
      question: submission.question,
      email: submission.email,
      status: submission.status,
    });
  }

  return NextResponse.json({ items: Array.from(byPollId.values()) });
}
