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

type EmailItem = {
  poll_id: number;
  submission_id: number | null;
  email: string | null;
  status: string;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  const [
    { data: polls, error: pollsError },
    { data: submissions, error: submissionsError },
    { data: contacts, error: contactsError },
  ] = await Promise.all([
    supabase
      .from("polls")
      .select("id, is_publicly_listed, submitter_email")
      .order("created_at", { ascending: false }),
    supabase
      .from("poll_submissions")
      .select("id, poll_id, email, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("poll_submitter_contacts")
      .select("poll_id, email"),
  ]);

  if (pollsError || submissionsError || contactsError) {
    return NextResponse.json({ error: "Could not load submitter emails." }, { status: 500 });
  }

  const contactEmailByPollId = new Map<number, string>();
  for (const contact of contacts || []) {
    if (!contact.email) continue;
    contactEmailByPollId.set(Number(contact.poll_id), String(contact.email));
  }

  const pollEmailByPollId = new Map<number, string | null>();
  const items: EmailItem[] = [];

  for (const poll of polls || []) {
    const pollId = Number(poll.id);
    const email =
      contactEmailByPollId.get(pollId) ||
      (poll.submitter_email ? String(poll.submitter_email) : null);

    pollEmailByPollId.set(pollId, email);
    items.push({
      poll_id: pollId,
      submission_id: null,
      email,
      status: poll.is_publicly_listed ? "live" : "not live",
    });
  }

  for (const submission of submissions || []) {
    const pollId = Number(submission.poll_id);
    if (!Number.isInteger(pollId)) continue;

    const email =
      (submission.email ? String(submission.email) : null) ||
      contactEmailByPollId.get(pollId) ||
      pollEmailByPollId.get(pollId) ||
      null;

    items.push({
      poll_id: pollId,
      submission_id: Number(submission.id),
      email,
      status: String(submission.status || "pending"),
    });
  }

  return NextResponse.json({ items });
}
